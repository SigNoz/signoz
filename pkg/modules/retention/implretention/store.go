package implretention

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

// NewStore creates a SQL-backed retention store.
func NewStore(sqlstore sqlstore.SQLStore) retentiontypes.Store {
	return &store{sqlstore: sqlstore}
}

// ListTTLSettingsByTableNameAndBeforeCreatedAt returns successful TTL settings before the given timestamp.
func (store *store) ListTTLSettingsByTableNameAndBeforeCreatedAt(ctx context.Context, orgID valuer.UUID, tableName string, beforeMs int64) ([]*retentiontypes.TTLSetting, error) {
	rows := []*retentiontypes.TTLSetting{}
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&rows).
		Where("table_name = ?", tableName).
		Where("org_id = ?", orgID.StringValue()).
		Where("status = ?", retentiontypes.TTLSettingStatusSuccess).
		Where("created_at < ?", time.UnixMilli(beforeMs).UTC()).
		OrderExpr("created_at ASC").
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "load ttl_setting rows for org %q table %q", orgID.StringValue(), tableName)
	}

	return rows, nil
}
