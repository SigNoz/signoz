package implretention

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store retentiontypes.Store
}

// NewGetter creates a retention getter backed by the retention store.
func NewGetter(store retentiontypes.Store) retention.Getter {
	return &getter{
		store: store,
	}
}

// GetRetentionPolicySegments loads successful TTL changes and converts them into retention policy segments.
func (getter *getter) GetRetentionPolicySegments(
	ctx context.Context,
	orgID valuer.UUID,
	dbName string,
	tableName string,
	fallbackDefaultDays int,
	startMs int64,
	endMs int64,
) ([]*retentiontypes.RetentionPolicySegment, error) {
	if startMs >= endMs {
		return nil, nil
	}
	if dbName == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dbName is empty")
	}
	if tableName == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "tableName is empty")
	}
	if fallbackDefaultDays <= 0 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "non-positive fallbackDefaultDays %d", fallbackDefaultDays)
	}

	rows, err := getter.store.ListTTLSettingsByTableNameAndBeforeCreatedAt(ctx, orgID, dbName+"."+tableName, endMs)
	if err != nil {
		return nil, err
	}

	return retentiontypes.BuildRetentionPolicySegmentsFromRows(rows, fallbackDefaultDays, startMs, endMs)
}
