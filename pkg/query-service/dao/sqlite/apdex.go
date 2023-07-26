package sqlite

import (
	"context"
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/model"
)

const defaultApdexThreshold = 0.5

func (mds *ModelDaoSqlite) GetApdexSettings(ctx context.Context, services []string) ([]model.ApdexSettings, *model.ApiError) {
	var apdexSettings []model.ApdexSettings
	var serviceName string

	for i, service := range services {
		if i == 0 {
			serviceName = fmt.Sprintf("'%s'", service)
		} else {
			serviceName = fmt.Sprintf("%s, '%s'", serviceName, service)
		}
	}

	query := fmt.Sprintf("SELECT * FROM apdex_settings WHERE service_name IN (%s)", serviceName)

	err := mds.db.Select(&apdexSettings, query)
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

	fmt.Println("apdexSettings:", apdexSettings)
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
