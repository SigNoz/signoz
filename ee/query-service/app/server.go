package app

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/ee/query-service/app/api"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/signoz"

	"log/slog"

	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp"
	opAmpModel "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	baseconst "github.com/SigNoz/signoz/pkg/query-service/constants"
)

// Server runs auxiliary servers (opamp) alongside the signoz apiserver
type Server struct {
	opampServer *opamp.Server

	// Usage manager
	usageManager *usage.Manager
}

// NewServer creates and initializes Server
func NewServer(config signoz.Config, signoz *signoz.SigNoz) (*Server, error) {
	reader := clickhouseReader.NewReader(
		signoz.Instrumentation.Logger(),
		signoz.SQLStore,
		signoz.TelemetryStore,
		signoz.Prometheus,
		signoz.TelemetryStore.Cluster(),
		signoz.Cache,
		signoz.Flagger,
		nil,
	)

	// initiate opamp
	opAmpModel.Init(signoz.SQLStore, signoz.Instrumentation.Logger(), signoz.Modules.OrgGetter)

	integrationsController, err := integrations.NewController(signoz.SQLStore, signoz.Modules.Dashboard)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create integrations controller: %w", err,
		)
	}

	// ingestion pipelines manager
	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		signoz.SQLStore,
		integrationsController.GetPipelinesForInstalledIntegrations,
		reader,
		signoz.Flagger,
	)
	if err != nil {
		return nil, err
	}

	// initiate agent config handler
	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		Store: signoz.SQLStore,
		AgentFeatures: []agentConf.AgentFeature{
			logParsingPipelineController,
			signoz.Modules.SpanMapper,
			signoz.Modules.LLMPricingRule,
		},
	})
	if err != nil {
		return nil, err
	}

	// start the usagemanager
	usageManager, err := usage.New(signoz.Licensing, signoz.TelemetryStore.ClickhouseDB(), signoz.Zeus, signoz.Modules.OrgGetter, signoz.Flagger)
	if err != nil {
		return nil, err
	}
	err = usageManager.Start(context.Background())
	if err != nil {
		return nil, err
	}

	apiOpts := api.APIHandlerOptions{
		DataConnector:                 reader,
		UsageManager:                  usageManager,
		IntegrationsController:        integrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		FluxInterval:                  config.Querier.FluxInterval,
		GatewayUrl:                    config.Gateway.URL.String(),
		GlobalConfig:                  config.Global,
	}

	apiHandler, err := api.NewAPIHandler(apiOpts, signoz, config)
	if err != nil {
		return nil, err
	}

	// Register the legacy query-service routes on the apiserver router. The
	// apiserver owns the HTTP server and applies the middleware chain at serve
	// time, so these routes get the same treatment as the apiserver routes.
	r := signoz.APIServer.Router()
	am := middleware.NewAuthZ(signoz.Instrumentation.Logger(), signoz.Modules.OrgGetter, signoz.Authz)

	apiHandler.RegisterRoutes(r, am)
	apiHandler.RegisterLogsRoutes(r, am)
	apiHandler.RegisterIntegrationRoutes(r, am)
	apiHandler.RegisterQueryRangeV3Routes(r, am)
	apiHandler.RegisterQueryRangeV4Routes(r, am)
	apiHandler.RegisterMessagingQueuesRoutes(r, am)
	apiHandler.RegisterThirdPartyApiRoutes(r, am)
	apiHandler.RegisterTraceFunnelsRoutes(r, am)

	s := &Server{
		usageManager: usageManager,
	}

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents, agentConfMgr, signoz.Instrumentation,
	)

	return s, nil
}

// Start starts the opamp websocket server. The HTTP API server is started by
// the signoz registry.
func (s *Server) Start(ctx context.Context) error {
	go func() {
		slog.Info("Starting OpAmp Websocket server", "addr", baseconst.OpAmpWsEndpoint)
		err := s.opampServer.Start(baseconst.OpAmpWsEndpoint)
		if err != nil {
			slog.Error("opamp ws server failed to start", errors.Attr(err))
		}
	}()

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	s.opampServer.Stop()

	// stop usage manager
	s.usageManager.Stop(ctx)

	return nil
}
