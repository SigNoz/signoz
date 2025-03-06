package sqlite

import (
	"context"

	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
)

const defaultApdexThreshold = 0.5

func (mds *ModelDaoSqlite) GetApdexSettings(ctx context.Context, orgID string, services []string) ([]types.ApdexSettings, *model.ApiError) {
	var apdexSettings []types.ApdexSettings

	err := mds.bundb.NewSelect().
		Model(&apdexSettings).
		Where("org_id = ?", orgID).
		Where("service_name IN (?)", bun.In(services)).
		Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{
			Err: err,
		}
	}

	// add default apdex settings for services that don't have any
	for _, service := range services {
		var found bool
		for _, apdexSetting := range apdexSettings {
			if apdexSetting.ServiceName == service {
				found = true
				break
			}
		}

		if !found {
			apdexSettings = append(apdexSettings, types.ApdexSettings{
				ServiceName: service,
				Threshold:   defaultApdexThreshold,
			})
		}
	}

	return apdexSettings, nil
}

func (mds *ModelDaoSqlite) SetApdexSettings(ctx context.Context, orgID string, apdexSettings *types.ApdexSettings) *model.ApiError {
	// Set the org_id from the parameter since it's required for the foreign key constraint
	apdexSettings.OrgID = orgID

	_, err := mds.bundb.NewInsert().
		Model(apdexSettings).
		On("CONFLICT (org_id, service_name) DO UPDATE").
		Set("threshold = EXCLUDED.threshold").
		Set("exclude_status_codes = EXCLUDED.exclude_status_codes").
		Exec(ctx)
	if err != nil {
		return &model.ApiError{
			Err: err,
		}
	}

	return nil
}
