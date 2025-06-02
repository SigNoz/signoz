package implapdex

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/apdextypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	defaultApdexThreshold float64 = 0.5
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) apdex.Module {
	return &module{
		sqlstore: sqlstore,
	}
}

func (module *module) Get(ctx context.Context, orgID string, services []string) ([]*apdextypes.Settings, error) {
	var apdexSettings []*apdextypes.Settings

	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&apdexSettings).
		Where("org_id = ?", orgID).
		Where("service_name IN (?)", bun.In(services)).
		Scan(ctx)
	if err != nil {
		return nil, module.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "apdex settings not found for services %v", services)
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
			apdexSettings = append(apdexSettings, &apdextypes.Settings{
				ServiceName: service,
				Threshold:   defaultApdexThreshold,
			})
		}
	}

	return apdexSettings, nil
}

func (module *module) Set(ctx context.Context, orgID string, apdexSettings *apdextypes.Settings) error {
	apdexSettings.OrgID = orgID
	apdexSettings.Identifiable.ID = valuer.GenerateUUID()

	_, err := module.
		sqlstore.
		BunDB().
		NewInsert().
		Model(apdexSettings).
		On("CONFLICT (org_id, service_name) DO UPDATE").
		Set("threshold = EXCLUDED.threshold").
		Set("exclude_status_codes = EXCLUDED.exclude_status_codes").
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
