package app

import (
	_ "net/http/pprof" // http profiler

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/app/api"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/dao"
	"go.signoz.io/signoz/ee/query-service/integrations/gateway"

	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	basedao "go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/registry"
)

func NewServer(cfg baseapp.Config, dbCfg basedao.Config, storageCfg clickhouseReader.Config) (*api.APIHandler, *sqlx.DB, registry.Service, error) {
	basehandler, db, service, err := baseapp.NewApiHandlerAndDBAndRulesManager(cfg, dbCfg, storageCfg)
	if err != nil {
		return nil, nil, nil, err
	}

	modelDao, err := dao.InitDao(dbc, dbCfg.Path)
	if err != nil {
		return nil, err
	}

	gatewayProxy, err := gateway.NewProxy(serverOptions.GatewayUrl, gateway.RoutePrefix)
	if err != nil {
		return nil, err
	}
	telemetry.GetInstance().SetSaasOperator(constants.SaasSegmentKey)

	apiHandler, err := api.NewAPIHandler(api.APIHandlerOptions{
		DataConnector:                 reader,
		SkipConfig:                    skipConfig,
		PreferSpanMetrics:             serverOptions.PreferSpanMetrics,
		MaxIdleConns:                  serverOptions.MaxIdleConns,
		MaxOpenConns:                  serverOptions.MaxOpenConns,
		DialTimeout:                   serverOptions.DialTimeout,
		AppDao:                        modelDao,
		RulesManager:                  rm,
		UsageManager:                  usageManager,
		FeatureFlags:                  lm,
		LicenseManager:                lm,
		IntegrationsController:        integrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		Cache:                         c,
		FluxInterval:                  fluxInterval,
		Gateway:                       gatewayProxy,
	})
	if err != nil {
		return nil, err
	}

	apiHandler.RegisterRoutes(r, am)
	apiHandler.RegisterLogsRoutes(r, am)
	apiHandler.RegisterIntegrationRoutes(r, am)
	apiHandler.RegisterQueryRangeV3Routes(r, am)
	apiHandler.RegisterQueryRangeV4Routes(r, am)

	return s, nil
}
