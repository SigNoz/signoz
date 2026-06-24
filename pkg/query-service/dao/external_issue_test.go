package dao

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)

	// Create table
	_, err = db.Exec(`
		CREATE TABLE external_issues (
			id TEXT PRIMARY KEY,
			alert_fingerprint BIGINT NOT NULL,
			rule_id TEXT NOT NULL,
			rule_name TEXT,
			external_system TEXT NOT NULL,
			external_issue_id TEXT NOT NULL,
			external_issue_url TEXT,
			sync_status TEXT NOT NULL DEFAULT 'synced',
			last_synced_at TIMESTAMP NOT NULL,
			sync_error TEXT,
			metadata TEXT DEFAULT '{}',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			org_id TEXT NOT NULL
		)
	`)
	require.NoError(t, err)

	// Create indexes
	_, err = db.Exec(`CREATE INDEX idx_external_issues_external_id ON external_issues(external_system, external_issue_id, org_id)`)
	require.NoError(t, err)

	_, err = db.Exec(`CREATE INDEX idx_external_issues_alert_fingerprint ON external_issues(alert_fingerprint, org_id)`)
	require.NoError(t, err)

	return db
}

func TestCreateExternalIssue(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-123",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-123",
		Metadata: model.ExternalIssueMetadata{
			"test": "value",
		},
	}

	issue, err := repo.CreateExternalIssue(ctx, req, "org-1")
	require.NoError(t, err)
	assert.NotEmpty(t, issue.ID)
	assert.Equal(t, uint64(12345), issue.AlertFingerprint)
	assert.Equal(t, "rule-123", issue.RuleID)
	assert.Equal(t, model.ExternalIssueSystemJira, issue.ExternalSystem)
	assert.Equal(t, "PROJ-123", issue.ExternalIssueID)
	assert.Equal(t, model.SyncStatusSynced, issue.SyncStatus)
}

func TestGetExternalIssueByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create an issue
	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-123",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-123",
	}

	created, err := repo.CreateExternalIssue(ctx, req, "org-1")
	require.NoError(t, err)

	// Get by ID
	issue, err := repo.GetExternalIssueByID(ctx, created.ID, "org-1")
	require.NoError(t, err)
	assert.Equal(t, created.ID, issue.ID)
	assert.Equal(t, created.ExternalIssueID, issue.ExternalIssueID)
}

func TestGetExternalIssueByExternalID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create an issue
	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-123",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-123",
	}

	_, err := repo.CreateExternalIssue(ctx, req, "org-1")
	require.NoError(t, err)

	// Get by external ID
	issue, err := repo.GetExternalIssueByExternalID(ctx, model.ExternalIssueSystemJira, "PROJ-123", "org-1")
	require.NoError(t, err)
	assert.Equal(t, "PROJ-123", issue.ExternalIssueID)
	assert.Equal(t, model.ExternalIssueSystemJira, issue.ExternalSystem)
}

func TestGetExternalIssuesByAlertFingerprint(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create multiple issues for the same alert
	for i := 1; i <= 3; i++ {
		req := &model.CreateExternalIssueRequest{
			AlertFingerprint: 12345,
			RuleID:           "rule-123",
			ExternalSystem:   model.ExternalIssueSystemJira,
			ExternalIssueID:  "PROJ-" + string(rune('0'+i)),
			ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-" + string(rune('0'+i)),
		}
		_, err := repo.CreateExternalIssue(ctx, req, "org-1")
		require.NoError(t, err)
	}

	// Get by fingerprint
	issues, err := repo.GetExternalIssuesByAlertFingerprint(ctx, 12345, "org-1")
	require.NoError(t, err)
	assert.Len(t, issues, 3)
}

func TestUpdateSyncStatus(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create an issue
	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-123",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-123",
	}

	created, err := repo.CreateExternalIssue(ctx, req, "org-1")
	require.NoError(t, err)

	// Update sync status
	err = repo.UpdateSyncStatus(ctx, created.ID, model.SyncStatusError, "test error", "org-1")
	require.NoError(t, err)

	// Verify update
	issue, err := repo.GetExternalIssueByID(ctx, created.ID, "org-1")
	require.NoError(t, err)
	assert.Equal(t, model.SyncStatusError, issue.SyncStatus)
	assert.Equal(t, "test error", issue.SyncError)
}

func TestDeleteExternalIssue(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create an issue
	req := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-123",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-123",
	}

	created, err := repo.CreateExternalIssue(ctx, req, "org-1")
	require.NoError(t, err)

	// Delete
	err = repo.DeleteExternalIssue(ctx, created.ID, "org-1")
	require.NoError(t, err)

	// Verify deletion
	_, err = repo.GetExternalIssueByID(ctx, created.ID, "org-1")
	assert.Error(t, err)
}

func TestListExternalIssues(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create multiple issues
	for i := 1; i <= 5; i++ {
		req := &model.CreateExternalIssueRequest{
			AlertFingerprint: uint64(12345 + i),
			RuleID:           "rule-123",
			ExternalSystem:   model.ExternalIssueSystemJira,
			ExternalIssueID:  "PROJ-" + string(rune('0'+i)),
			ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-" + string(rune('0'+i)),
		}
		_, err := repo.CreateExternalIssue(ctx, req, "org-1")
		require.NoError(t, err)
		time.Sleep(10 * time.Millisecond) // Ensure different timestamps
	}

	// List with pagination
	listReq := &model.QueryExternalIssuesRequest{
		Limit:  2,
		Offset: 0,
	}

	response, err := repo.ListExternalIssues(ctx, listReq, "org-1")
	require.NoError(t, err)
	assert.Equal(t, 5, response.Total)
	assert.Len(t, response.Items, 2)
}

func TestListExternalIssuesWithFilters(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewExternalIssueRepo(db)
	ctx := context.Background()

	// Create issues with different systems
	req1 := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12345,
		RuleID:           "rule-123",
		ExternalSystem:   model.ExternalIssueSystemJira,
		ExternalIssueID:  "PROJ-1",
		ExternalIssueURL: "https://company.atlassian.net/browse/PROJ-1",
	}
	_, err := repo.CreateExternalIssue(ctx, req1, "org-1")
	require.NoError(t, err)

	req2 := &model.CreateExternalIssueRequest{
		AlertFingerprint: 12346,
		RuleID:           "rule-456",
		ExternalSystem:   model.ExternalIssueSystemGitHub,
		ExternalIssueID:  "123",
		ExternalIssueURL: "https://github.com/org/repo/issues/123",
	}
	_, err = repo.CreateExternalIssue(ctx, req2, "org-1")
	require.NoError(t, err)

	// Filter by system
	listReq := &model.QueryExternalIssuesRequest{
		ExternalSystem: model.ExternalIssueSystemJira,
	}

	response, err := repo.ListExternalIssues(ctx, listReq, "org-1")
	require.NoError(t, err)
	assert.Equal(t, 1, response.Total)
	assert.Equal(t, model.ExternalIssueSystemJira, response.Items[0].ExternalSystem)
}
