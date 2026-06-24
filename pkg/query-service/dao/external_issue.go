package dao

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/google/uuid"
)

var (
	ErrExternalIssueNotFound  = errors.MustNewCode("external_issue_not_found")
	ErrExternalIssueDuplicate = errors.MustNewCode("external_issue_duplicate")
)

// ExternalIssueRepo handles database operations for external issues
type ExternalIssueRepo interface {
	// CreateExternalIssue creates a new external issue mapping
	CreateExternalIssue(ctx context.Context, req *model.CreateExternalIssueRequest, orgID string) (*model.ExternalIssue, error)
	
	// GetExternalIssueByID retrieves an external issue by its ID
	GetExternalIssueByID(ctx context.Context, id string, orgID string) (*model.ExternalIssue, error)
	
	// GetExternalIssueByExternalID retrieves an external issue by external system and issue ID
	GetExternalIssueByExternalID(ctx context.Context, externalSystem model.ExternalIssueSystem, externalIssueID string, orgID string) (*model.ExternalIssue, error)
	
	// GetExternalIssuesByAlertFingerprint retrieves all external issues for an alert fingerprint
	GetExternalIssuesByAlertFingerprint(ctx context.Context, fingerprint uint64, orgID string) ([]model.ExternalIssue, error)
	
	// GetExternalIssuesByRuleID retrieves all external issues for a rule
	GetExternalIssuesByRuleID(ctx context.Context, ruleID string, orgID string) ([]model.ExternalIssue, error)
	
	// ListExternalIssues lists external issues with optional filters
	ListExternalIssues(ctx context.Context, req *model.QueryExternalIssuesRequest, orgID string) (*model.ExternalIssueListResponse, error)
	
	// UpdateExternalIssue updates an external issue
	UpdateExternalIssue(ctx context.Context, id string, req *model.UpdateExternalIssueRequest, orgID string) error
	
	// UpdateSyncStatus updates the sync status of an external issue
	UpdateSyncStatus(ctx context.Context, id string, status model.SyncStatus, syncError string, orgID string) error
	
	// DeleteExternalIssue deletes an external issue mapping
	DeleteExternalIssue(ctx context.Context, id string, orgID string) error
}

type externalIssueRepo struct {
	db *sql.DB
}

// NewExternalIssueRepo creates a new external issue repository
func NewExternalIssueRepo(db *sql.DB) ExternalIssueRepo {
	return &externalIssueRepo{db: db}
}

func (r *externalIssueRepo) CreateExternalIssue(ctx context.Context, req *model.CreateExternalIssueRequest, orgID string) (*model.ExternalIssue, error) {
	// Check if mapping already exists
	existing, err := r.GetExternalIssueByExternalID(ctx, req.ExternalSystem, req.ExternalIssueID, orgID)
	if err == nil && existing != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrExternalIssueDuplicate, "external issue mapping already exists")
	}

	now := time.Now()
	issue := &model.ExternalIssue{
		ID:               uuid.New().String(),
		AlertFingerprint: req.AlertFingerprint,
		RuleID:           req.RuleID,
		ExternalSystem:   req.ExternalSystem,
		ExternalIssueID:  req.ExternalIssueID,
		ExternalIssueURL: req.ExternalIssueURL,
		SyncStatus:       model.SyncStatusSynced,
		LastSyncedAt:     now,
		Metadata:         req.Metadata,
		CreatedAt:        now,
		UpdatedAt:        now,
		OrgID:            orgID,
	}

	if issue.Metadata == nil {
		issue.Metadata = make(model.ExternalIssueMetadata)
	}

	metadataJSON, err := issue.Metadata.Value()
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to marshal metadata")
	}

	query := `
		INSERT INTO external_issues (
			id, alert_fingerprint, rule_id, external_system, external_issue_id, 
			external_issue_url, sync_status, last_synced_at, metadata, 
			created_at, updated_at, org_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	// Convert fingerprint to string for SQLite compatibility
	fingerprintStr := fmt.Sprintf("%d", issue.AlertFingerprint)

	_, err = r.db.ExecContext(ctx, query,
		issue.ID, fingerprintStr, issue.RuleID, issue.ExternalSystem,
		issue.ExternalIssueID, issue.ExternalIssueURL, issue.SyncStatus,
		issue.LastSyncedAt, metadataJSON, issue.CreatedAt, issue.UpdatedAt, issue.OrgID,
	)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to create external issue")
	}

	return issue, nil
}

func (r *externalIssueRepo) GetExternalIssueByID(ctx context.Context, id string, orgID string) (*model.ExternalIssue, error) {
	query := `
		SELECT id, alert_fingerprint, rule_id, external_system, external_issue_id,
			external_issue_url, sync_status, last_synced_at, sync_error, metadata,
			created_at, updated_at, org_id
		FROM external_issues
		WHERE id = ? AND org_id = ?
	`

	var issue model.ExternalIssue
	var fingerprintStr string
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&issue.ID, &fingerprintStr, &issue.RuleID, &issue.ExternalSystem,
		&issue.ExternalIssueID, &issue.ExternalIssueURL, &issue.SyncStatus,
		&issue.LastSyncedAt, &issue.SyncError, &issue.Metadata,
		&issue.CreatedAt, &issue.UpdatedAt, &issue.OrgID,
	)
	if err == sql.ErrNoRows {
		return nil, errors.Newf(errors.TypeNotFound, ErrExternalIssueNotFound, "external issue not found")
	}
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get external issue")
	}

	// Convert fingerprint string back to uint64
	issue.AlertFingerprint, err = strconv.ParseUint(fingerprintStr, 10, 64)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse alert fingerprint")
	}

	return &issue, nil
}

func (r *externalIssueRepo) GetExternalIssueByExternalID(ctx context.Context, externalSystem model.ExternalIssueSystem, externalIssueID string, orgID string) (*model.ExternalIssue, error) {
	query := `
		SELECT id, alert_fingerprint, rule_id, external_system, external_issue_id,
			external_issue_url, sync_status, last_synced_at, sync_error, metadata,
			created_at, updated_at, org_id
		FROM external_issues
		WHERE external_system = ? AND external_issue_id = ? AND org_id = ?
	`

	var issue model.ExternalIssue
	var fingerprintStr string
	err := r.db.QueryRowContext(ctx, query, externalSystem, externalIssueID, orgID).Scan(
		&issue.ID, &fingerprintStr, &issue.RuleID, &issue.ExternalSystem,
		&issue.ExternalIssueID, &issue.ExternalIssueURL, &issue.SyncStatus,
		&issue.LastSyncedAt, &issue.SyncError, &issue.Metadata,
		&issue.CreatedAt, &issue.UpdatedAt, &issue.OrgID,
	)
	if err == sql.ErrNoRows {
		return nil, errors.Newf(errors.TypeNotFound, ErrExternalIssueNotFound, "external issue not found")
	}
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get external issue")
	}

	// Convert fingerprint string back to uint64
	issue.AlertFingerprint, err = strconv.ParseUint(fingerprintStr, 10, 64)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse alert fingerprint")
	}

	return &issue, nil
}

func (r *externalIssueRepo) GetExternalIssuesByAlertFingerprint(ctx context.Context, fingerprint uint64, orgID string) ([]model.ExternalIssue, error) {
	query := `
		SELECT id, alert_fingerprint, rule_id, external_system, external_issue_id,
			external_issue_url, sync_status, last_synced_at, sync_error, metadata,
			created_at, updated_at, org_id
		FROM external_issues
		WHERE alert_fingerprint = ? AND org_id = ?
		ORDER BY created_at DESC
	`

	// Convert fingerprint to string for query
	fingerprintStr := fmt.Sprintf("%d", fingerprint)

	rows, err := r.db.QueryContext(ctx, query, fingerprintStr, orgID)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query external issues")
	}
	defer rows.Close()

	var issues []model.ExternalIssue
	for rows.Next() {
		var issue model.ExternalIssue
		var fingerprintStr string
		err := rows.Scan(
			&issue.ID, &fingerprintStr, &issue.RuleID, &issue.ExternalSystem,
			&issue.ExternalIssueID, &issue.ExternalIssueURL, &issue.SyncStatus,
			&issue.LastSyncedAt, &issue.SyncError, &issue.Metadata,
			&issue.CreatedAt, &issue.UpdatedAt, &issue.OrgID,
		)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan external issue")
		}

		// Convert fingerprint string back to uint64
		issue.AlertFingerprint, err = strconv.ParseUint(fingerprintStr, 10, 64)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse alert fingerprint")
		}

		issues = append(issues, issue)
	}

	return issues, nil
}

func (r *externalIssueRepo) GetExternalIssuesByRuleID(ctx context.Context, ruleID string, orgID string) ([]model.ExternalIssue, error) {
	query := `
		SELECT id, alert_fingerprint, rule_id, external_system, external_issue_id,
			external_issue_url, sync_status, last_synced_at, sync_error, metadata,
			created_at, updated_at, org_id
		FROM external_issues
		WHERE rule_id = ? AND org_id = ?
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, ruleID, orgID)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query external issues")
	}
	defer rows.Close()

	var issues []model.ExternalIssue
	for rows.Next() {
		var issue model.ExternalIssue
		var fingerprintStr string
		err := rows.Scan(
			&issue.ID, &fingerprintStr, &issue.RuleID, &issue.ExternalSystem,
			&issue.ExternalIssueID, &issue.ExternalIssueURL, &issue.SyncStatus,
			&issue.LastSyncedAt, &issue.SyncError, &issue.Metadata,
			&issue.CreatedAt, &issue.UpdatedAt, &issue.OrgID,
		)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan external issue")
		}

		// Convert fingerprint string back to uint64
		issue.AlertFingerprint, err = strconv.ParseUint(fingerprintStr, 10, 64)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse alert fingerprint")
		}

		issues = append(issues, issue)
	}

	return issues, nil
}

func (r *externalIssueRepo) ListExternalIssues(ctx context.Context, req *model.QueryExternalIssuesRequest, orgID string) (*model.ExternalIssueListResponse, error) {
	whereClause := "WHERE org_id = ?"
	args := []interface{}{orgID}

	if req.RuleID != "" {
		whereClause += " AND rule_id = ?"
		args = append(args, req.RuleID)
	}
	if req.ExternalSystem != "" {
		whereClause += " AND external_system = ?"
		args = append(args, req.ExternalSystem)
	}
	if req.SyncStatus != "" {
		whereClause += " AND sync_status = ?"
		args = append(args, req.SyncStatus)
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM external_issues %s", whereClause)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to count external issues")
	}

	// Get items
	limit := req.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT id, alert_fingerprint, rule_id, external_system, external_issue_id,
			external_issue_url, sync_status, last_synced_at, sync_error, metadata,
			created_at, updated_at, org_id
		FROM external_issues
		%s
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query external issues")
	}
	defer rows.Close()

	var issues []model.ExternalIssue
	for rows.Next() {
		var issue model.ExternalIssue
		var fingerprintStr string
		err := rows.Scan(
			&issue.ID, &fingerprintStr, &issue.RuleID, &issue.ExternalSystem,
			&issue.ExternalIssueID, &issue.ExternalIssueURL, &issue.SyncStatus,
			&issue.LastSyncedAt, &issue.SyncError, &issue.Metadata,
			&issue.CreatedAt, &issue.UpdatedAt, &issue.OrgID,
		)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan external issue")
		}

		// Convert fingerprint string back to uint64
		issue.AlertFingerprint, err = strconv.ParseUint(fingerprintStr, 10, 64)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse alert fingerprint")
		}

		issues = append(issues, issue)
	}

	return &model.ExternalIssueListResponse{
		Items: issues,
		Total: total,
	}, nil
}

func (r *externalIssueRepo) UpdateExternalIssue(ctx context.Context, id string, req *model.UpdateExternalIssueRequest, orgID string) error {
	now := time.Now()
	
	query := `
		UPDATE external_issues
		SET sync_status = ?, sync_error = ?, last_synced_at = ?, updated_at = ?
		WHERE id = ? AND org_id = ?
	`

	result, err := r.db.ExecContext(ctx, query, req.SyncStatus, req.SyncError, now, now, id, orgID)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to update external issue")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, ErrExternalIssueNotFound, "external issue not found")
	}

	return nil
}

func (r *externalIssueRepo) UpdateSyncStatus(ctx context.Context, id string, status model.SyncStatus, syncError string, orgID string) error {
	now := time.Now()
	
	query := `
		UPDATE external_issues
		SET sync_status = ?, sync_error = ?, last_synced_at = ?, updated_at = ?
		WHERE id = ? AND org_id = ?
	`

	result, err := r.db.ExecContext(ctx, query, status, syncError, now, now, id, orgID)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to update sync status")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, ErrExternalIssueNotFound, "external issue not found")
	}

	return nil
}

func (r *externalIssueRepo) DeleteExternalIssue(ctx context.Context, id string, orgID string) error {
	query := `DELETE FROM external_issues WHERE id = ? AND org_id = ?`

	result, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to delete external issue")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, ErrExternalIssueNotFound, "external issue not found")
	}

	return nil
}
