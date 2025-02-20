package sqlite

import (
	"context"

	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
)

const defaultApdexThreshold = 0.5

func (mds *ModelDaoSqlite) GetApdexSettings(ctx context.Context, services []string) ([]types.ApdexSettings, *model.ApiError) {
	var apdexSettings []types.ApdexSettings

	err := mds.bundb.NewSelect().
		Model(&apdexSettings).
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

func (mds *ModelDaoSqlite) SetApdexSettings(ctx context.Context, apdexSettings *types.ApdexSettings) *model.ApiError {

	_, err := mds.bundb.Exec(`
	INSERT OR REPLACE INTO apdex_settings (
		service_name,
		threshold,
		exclude_status_codes
	) VALUES (
		:service_name,
		:threshold,
		:exclude_status_codes
	)`, apdexSettings)
	if err != nil {
		return &model.ApiError{
			Err: err,
		}
	}

	return nil
}
