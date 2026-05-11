package implretention

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const secondsPerDay = 24 * 60 * 60

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
) ([]retentiontypes.RetentionPolicySegment, error) {
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

	rows, err := getter.store.ListTTLSettings(ctx, orgID, dbName+"."+tableName, endMs)
	if err != nil {
		return nil, err
	}

	return buildRetentionPolicySegmentsFromRows(rows, fallbackDefaultDays, startMs, endMs)
}

func buildRetentionPolicySegmentsFromRows(rows []*retentiontypes.TTLSetting, fallbackDefaultDays int, startMs, endMs int64) ([]retentiontypes.RetentionPolicySegment, error) {
	if startMs >= endMs {
		return nil, nil
	}

	var activeAtStart *retentiontypes.TTLSetting
	inWindow := make([]*retentiontypes.TTLSetting, 0, len(rows))
	for _, row := range rows {
		rowMs := row.CreatedAt.UnixMilli()
		if rowMs <= startMs {
			activeAtStart = row
			continue
		}
		if rowMs >= endMs {
			continue
		}
		inWindow = append(inWindow, row)
	}

	activeRules, activeDefault, err := parseTTLSetting(activeAtStart, fallbackDefaultDays)
	if err != nil {
		return nil, err
	}

	segments := make([]retentiontypes.RetentionPolicySegment, 0, len(inWindow)+1)
	cursor := startMs
	for _, row := range inWindow {
		rowMs := row.CreatedAt.UnixMilli()
		if rowMs <= cursor {
			activeRules, activeDefault, err = parseTTLSetting(row, fallbackDefaultDays)
			if err != nil {
				return nil, err
			}
			continue
		}
		segments = append(segments, retentiontypes.RetentionPolicySegment{
			StartMs:     cursor,
			EndMs:       rowMs,
			Rules:       activeRules,
			DefaultDays: activeDefault,
		})
		cursor = rowMs
		activeRules, activeDefault, err = parseTTLSetting(row, fallbackDefaultDays)
		if err != nil {
			return nil, err
		}
	}

	if cursor < endMs {
		segments = append(segments, retentiontypes.RetentionPolicySegment{
			StartMs:     cursor,
			EndMs:       endMs,
			Rules:       activeRules,
			DefaultDays: activeDefault,
		})
	}

	return segments, nil
}

func parseTTLSetting(row *retentiontypes.TTLSetting, fallbackDefaultDays int) ([]retentiontypes.CustomRetentionRule, int, error) {
	if row == nil {
		return nil, fallbackDefaultDays, nil
	}

	defaultDays := row.TTL
	if row.Condition == "" {
		defaultDays = (row.TTL + secondsPerDay - 1) / secondsPerDay
	}
	if defaultDays <= 0 {
		defaultDays = fallbackDefaultDays
	}

	if row.Condition == "" {
		return nil, defaultDays, nil
	}

	var rules []retentiontypes.CustomRetentionRule
	if err := json.Unmarshal([]byte(row.Condition), &rules); err != nil {
		return nil, 0, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "parse ttl_setting condition for row %q", row.ID.StringValue())
	}

	return rules, defaultDays, nil
}
