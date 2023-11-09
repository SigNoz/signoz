package sqlite

import (
	"context"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

const defaultApdexThreshold = 0.5

func (mds *ModelDaoSqlite) GetApdexSettings(ctx context.Context, services []string) ([]model.ApdexSettings, *model.ApiError) {
	var apdexSettings []model.ApdexSettings

	query, args, err := sqlx.In("SELECT * FROM apdex_settings WHERE service_name IN (?)", services)
	if err != nil {
		return nil, &model.ApiError{
			Err: err,
		}
	}
	query = mds.db.Rebind(query)

	err = mds.db.Select(&apdexSettings, query, args...)
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
			apdexSettings = append(apdexSettings, model.ApdexSettings{
				ServiceName: service,
				Threshold:   defaultApdexThreshold,
			})
		}
	}

	return apdexSettings, nil
}

func (mds *ModelDaoSqlite) SetApdexSettings(ctx context.Context, apdexSettings *model.ApdexSettings) *model.ApiError {

	_, err := mds.db.NamedExec(`
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
