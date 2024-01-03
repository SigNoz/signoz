package sqlite

import (
	"context"

	"go.signoz.io/signoz/ee/query-service/model"
)

// GetQueryLimits returns the query limits
func (m *modelDao) GetQueryLimits(ctx context.Context) ([]*model.QueryLimit, error) {
	query := `SELECT name, title, usage_limit FROM resource_usage_limits`
	var queryLimits []*model.QueryLimit
	err := m.DB().Select(&queryLimits, query)
	if err != nil {
		return nil, err
	}
	return queryLimits, nil
}

// AddQueryLimits adds the query limits
func (m *modelDao) AddQueryLimits(ctx context.Context, queryLimits []*model.QueryLimit) error {
	tx := m.DB().MustBegin()
	for _, queryLimit := range queryLimits {
		query := `INSERT INTO resource_usage_limits (name, title, usage_limit) VALUES (?, ?, ?)`
		_, err := tx.Exec(query, queryLimit.Name, queryLimit.Title, queryLimit.UsageLimit)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	err := tx.Commit()
	if err != nil {
		return err
	}
	return nil
}

// UpdateQueryLimits updates the query limits
func (m *modelDao) UpdateQueryLimits(ctx context.Context, queryLimits []*model.QueryLimit) error {
	tx := m.DB().MustBegin()
	for _, queryLimit := range queryLimits {
		query := `UPDATE resource_usage_limits SET usage_limit = ? WHERE name = ?`
		_, err := tx.Exec(query, queryLimit.UsageLimit, queryLimit.Name)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	err := tx.Commit()
	if err != nil {
		return err
	}
	return nil
}
