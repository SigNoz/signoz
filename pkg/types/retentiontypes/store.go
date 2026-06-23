package retentiontypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// ListTTLSettingsByTableNameAndBeforeCreatedAt returns successful TTL settings before the given timestamp.
	ListTTLSettingsByTableNameAndBeforeCreatedAt(ctx context.Context, orgID valuer.UUID, tableName string, beforeMs int64) ([]*TTLSetting, error)
}
