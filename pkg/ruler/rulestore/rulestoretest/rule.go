package rulestoretest

import (
	"context"
	"regexp"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MockSQLRuleStore is a mock RuleStore backed by sqlmock
type MockSQLRuleStore struct {
	ruleStore ruletypes.RuleStore
	mock      sqlmock.Sqlmock
}

// NewMockSQLRuleStore creates a new MockSQLRuleStore with sqlmock
func NewMockSQLRuleStore() *MockSQLRuleStore {
	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	ruleStore := sqlrulestore.NewRuleStore(sqlStore)

	return &MockSQLRuleStore{
		ruleStore: ruleStore,
		mock:      sqlStore.Mock(),
	}
}

// Mock returns the sqlmock.Sqlmock instance for setting expectations
func (m *MockSQLRuleStore) Mock() sqlmock.Sqlmock {
	return m.mock
}

// CreateRule implements ruletypes.RuleStore - delegates to underlying ruleStore to trigger SQL
func (m *MockSQLRuleStore) CreateRule(ctx context.Context, rule *ruletypes.Rule, fn func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return m.ruleStore.CreateRule(ctx, rule, fn)
}

// EditRule implements ruletypes.RuleStore - delegates to underlying ruleStore to trigger SQL
func (m *MockSQLRuleStore) EditRule(ctx context.Context, rule *ruletypes.Rule, fn func(context.Context) error) error {
	return m.ruleStore.EditRule(ctx, rule, fn)
}

// DeleteRule implements ruletypes.RuleStore - delegates to underlying ruleStore to trigger SQL
func (m *MockSQLRuleStore) DeleteRule(ctx context.Context, id valuer.UUID, fn func(context.Context) error) error {
	return m.ruleStore.DeleteRule(ctx, id, fn)
}

// GetStoredRule implements ruletypes.RuleStore - delegates to underlying ruleStore to trigger SQL
func (m *MockSQLRuleStore) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	return m.ruleStore.GetStoredRule(ctx, id)
}

// GetStoredRules implements ruletypes.RuleStore - delegates to underlying ruleStore to trigger SQL
func (m *MockSQLRuleStore) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	return m.ruleStore.GetStoredRules(ctx, orgID)
}

// ExpectCreateRule sets up SQL expectations for CreateRule operation
func (m *MockSQLRuleStore) ExpectCreateRule(rule *ruletypes.Rule) {
	rows := sqlmock.NewRows([]string{"id", "created_at", "updated_at", "created_by", "updated_by", "deleted", "data", "org_id"}).
		AddRow(rule.ID, rule.CreatedAt, rule.UpdatedAt, rule.CreatedBy, rule.UpdatedBy, rule.Deleted, rule.Data, rule.OrgID)
	expectedPattern := `INSERT INTO "rule" \(.+\) VALUES \(.+` +
		regexp.QuoteMeta(rule.CreatedBy) + `.+` +
		regexp.QuoteMeta(rule.OrgID) + `.+\) RETURNING`
	m.mock.ExpectQuery(expectedPattern).
		WillReturnRows(rows)
}

// ExpectEditRule sets up SQL expectations for EditRule operation
func (m *MockSQLRuleStore) ExpectEditRule(rule *ruletypes.Rule) {
	expectedPattern := `UPDATE "rule".+` + rule.UpdatedBy + `.+` + rule.OrgID + `.+WHERE \(id = '` + rule.ID.StringValue() + `'\)`
	m.mock.ExpectExec(expectedPattern).
		WillReturnResult(sqlmock.NewResult(1, 1))
}

// ExpectDeleteRule sets up SQL expectations for DeleteRule operation
func (m *MockSQLRuleStore) ExpectDeleteRule(ruleID valuer.UUID) {
	expectedPattern := `DELETE FROM "rule".+WHERE \(id = '` + ruleID.StringValue() + `'\)`
	m.mock.ExpectExec(expectedPattern).
		WillReturnResult(sqlmock.NewResult(1, 1))
}

// ExpectGetStoredRule sets up SQL expectations for GetStoredRule operation
func (m *MockSQLRuleStore) ExpectGetStoredRule(ruleID valuer.UUID, rule *ruletypes.Rule) {
	rows := sqlmock.NewRows([]string{"id", "created_at", "updated_at", "created_by", "updated_by", "deleted", "data", "org_id"}).
		AddRow(rule.ID, rule.CreatedAt, rule.UpdatedAt, rule.CreatedBy, rule.UpdatedBy, rule.Deleted, rule.Data, rule.OrgID)
	expectedPattern := `SELECT (.+) FROM "rule".+WHERE \(id = '` + ruleID.StringValue() + `'\)`
	m.mock.ExpectQuery(expectedPattern).
		WillReturnRows(rows)
}

// ExpectGetStoredRules sets up SQL expectations for GetStoredRules operation
func (m *MockSQLRuleStore) ExpectGetStoredRules(orgID string, rules []*ruletypes.Rule) {
	rows := sqlmock.NewRows([]string{"id", "created_at", "updated_at", "created_by", "updated_by", "deleted", "data", "org_id"})
	for _, rule := range rules {
		rows.AddRow(rule.ID, rule.CreatedAt, rule.UpdatedAt, rule.CreatedBy, rule.UpdatedBy, rule.Deleted, rule.Data, rule.OrgID)
	}
	expectedPattern := `SELECT (.+) FROM "rule".+WHERE \(.+org_id.+'` + orgID + `'\)`
	m.mock.ExpectQuery(expectedPattern).
		WillReturnRows(rows)
}

// AssertExpectations asserts that all SQL expectations were met
func (m *MockSQLRuleStore) AssertExpectations() error {
	return m.mock.ExpectationsWereMet()
}
