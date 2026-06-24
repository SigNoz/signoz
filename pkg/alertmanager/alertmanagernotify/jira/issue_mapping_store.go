package jira

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
)

// issueMappingStoreAdapter adapts the ExternalIssueRepo to the IssueMappingStore interface
type issueMappingStoreAdapter struct {
	repo dao.ExternalIssueRepo
}

// NewIssueMappingStore creates a new issue mapping store from an external issue repository
func NewIssueMappingStore(repo dao.ExternalIssueRepo) IssueMappingStore {
	return &issueMappingStoreAdapter{repo: repo}
}

// StoreIssueMapping stores a mapping between a Jira issue and a SigNoz alert
func (s *issueMappingStoreAdapter) StoreIssueMapping(ctx context.Context, issueKey string, fingerprint uint64, ruleID string, orgID string, issueURL string) error {
	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: fingerprint,
		RuleID:           ruleID,
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  issueKey,
		ExternalIssueURL: issueURL,
		Metadata: model.ExternalIssueMetadata{
			"created_by": "jira_notifier",
			"created_at": time.Now().Format(time.RFC3339),
		},
	}

	_, err := s.repo.CreateExternalIssue(ctx, req, orgID)
	if err != nil {
		// Check if it's a duplicate error using errors.Asc
		if errors.Asc(err, dao.ErrExternalIssueDuplicate) {
			// Mapping already exists, that's okay
			return nil
		}
		return err
	}

	return nil
}
