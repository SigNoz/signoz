package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"slices"

	"github.com/SigNoz/signoz/pkg/cache/memorycache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/queryparser"

	"github.com/gorilla/handlers"

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/licensing/nooplicensing"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp"
	opAmpModel "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/web"

	"log/slog"

	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel/propagation"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/healthcheck"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
)

// Server runs HTTP, Mux and a grpc server
type Server struct {
	config signoz.Config
	signoz *signoz.SigNoz

	// public http router
	httpConn     net.Listener
	httpServer   *http.Server
	httpHostPort string

	opampServer *opamp.Server

	unavailableChannel chan healthcheck.Status
}

// NewServer creates and initializes Server
func NewServer(config signoz.Config, signoz *signoz.SigNoz) (*Server, error) {
	integrationsController, err := integrations.NewController(signoz.SQLStore)
	if err != nil {
		return nil, err
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(signoz.SQLStore)
	if err != nil {
		return nil, err
	}

	cacheForTraceDetail, err := memorycache.New(context.TODO(), signoz.Instrumentation.ToProviderSettings(), cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 10000,
			MaxCost:     1 << 27, // 128 MB
		},
	})
	if err != nil {
		return nil, err
	}

	reader := clickhouseReader.NewReader(
		signoz.Instrumentation.Logger(),
		signoz.SQLStore,
		signoz.TelemetryStore,
		signoz.Prometheus,
		signoz.TelemetryStore.Cluster(),
		config.Querier.FluxInterval,
		cacheForTraceDetail,
		signoz.Cache,
		nil,
	)

	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		signoz.SQLStore,
		integrationsController.GetPipelinesForInstalledIntegrations,
		reader,
		signoz.Flagger,
	)
	if err != nil {
		return nil, err
	}

	apiHandler, err := NewAPIHandler(APIHandlerOpts{
		Reader:                        reader,
		IntegrationsController:        integrationsController,
		CloudIntegrationsController:   cloudIntegrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		FluxInterval:                  config.Querier.FluxInterval,
		LicensingAPI:                  nooplicensing.NewLicenseAPI(),
		Signoz:                        signoz,
		QueryParserAPI:                queryparser.NewAPI(signoz.Instrumentation.ToProviderSettings(), signoz.QueryParser),
	}, config)
	if err != nil {
		return nil, err
	}

	s := &Server{
		config:             config,
		signoz:             signoz,
		httpHostPort:       constants.HTTPHostPort,
		unavailableChannel: make(chan healthcheck.Status),
	}

	httpServer, err := s.createPublicServer(apiHandler, signoz.Web)

	if err != nil {
		return nil, err
	}

	s.httpServer = httpServer

	opAmpModel.Init(signoz.SQLStore, signoz.Instrumentation.Logger(), signoz.Modules.OrgGetter)

	agentConfMgr, err := agentConf.Initiate(
		&agentConf.ManagerOptions{
			Store: signoz.SQLStore,
			AgentFeatures: []agentConf.AgentFeature{
				logParsingPipelineController,
				signoz.Modules.LLMPricingRule,
			},
		},
	)
	if err != nil {
		return nil, err
	}

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents,
		agentConfMgr,
		signoz.Instrumentation,
	)

	return s, nil
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

func (s *Server) createPublicServer(api *APIHandler, web web.Web) (*http.Server, error) {
	r := NewRouter()

	r.Use(middleware.NewRecovery(s.signoz.Instrumentation.Logger()).Wrap)
	r.Use(otelmux.Middleware(
		"apiserver",
		otelmux.WithMeterProvider(s.signoz.Instrumentation.MeterProvider()),
		otelmux.WithTracerProvider(s.signoz.Instrumentation.TracerProvider()),
		otelmux.WithPropagators(propagation.NewCompositeTextMapPropagator(propagation.Baggage{}, propagation.TraceContext{})),
		otelmux.WithFilter(func(r *http.Request) bool {
			return !slices.Contains([]string{"/api/v1/health"}, r.URL.Path)
		}),
	))
	r.Use(middleware.NewIdentN(s.signoz.IdentNResolver, s.signoz.Sharder, s.signoz.Instrumentation.Logger()).Wrap)
	r.Use(middleware.NewTimeout(s.signoz.Instrumentation.Logger(),
		s.config.APIServer.Timeout.ExcludedRoutes,
		s.config.APIServer.Timeout.Default,
		s.config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAudit(s.signoz.Instrumentation.Logger(), s.config.APIServer.Logging.ExcludedRoutes, s.signoz.Auditor).Wrap)
	r.Use(middleware.NewComment().Wrap)

	am := middleware.NewAuthZ(s.signoz.Instrumentation.Logger(), s.signoz.Modules.OrgGetter, s.signoz.Authz)

	api.RegisterRoutes(r, am)
	api.RegisterLogsRoutes(r, am)
	api.RegisterIntegrationRoutes(r, am)
	api.RegisterCloudIntegrationsRoutes(r, am)
	api.RegisterQueryRangeV3Routes(r, am)
	api.RegisterInfraMetricsRoutes(r, am)
	api.RegisterWebSocketPaths(r, am)
	api.RegisterQueryRangeV4Routes(r, am)
	api.RegisterMessagingQueuesRoutes(r, am)
	api.RegisterThirdPartyApiRoutes(r, am)
	api.RegisterTraceFunnelsRoutes(r, am)

	err := s.signoz.APIServer.AddToRouter(r)
	if err != nil {
		return nil, err
	}

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)

	handler = handlers.CompressHandler(handler)

	err = web.AddToRouter(r)
	if err != nil {
		return nil, err
	}

	routePrefix := s.config.Global.ExternalPath()
	if routePrefix != "" {
		prefixed := http.StripPrefix(routePrefix, handler)
		handler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			switch req.URL.Path {
			case "/api/v1/health", "/api/v2/healthz", "/api/v2/readyz", "/api/v2/livez":
				r.ServeHTTP(w, req)
				return
			}

			prefixed.ServeHTTP(w, req)
		})
	}

	return &http.Server{
		Handler: handler,
	}, nil
}

// initListeners initialises listeners of the server
func (s *Server) initListeners() error {
	// listen on public port
	var err error
	publicHostPort := s.httpHostPort
	if publicHostPort == "" {
		return fmt.Errorf("constants.HTTPHostPort is required")
	}

	s.httpConn, err = net.Listen("tcp", publicHostPort)
	if err != nil {
		return err
	}

	slog.Info(fmt.Sprintf("Query server started listening on %s...", s.httpHostPort))

	return nil
}

// Start listening on http and private http port concurrently
func (s *Server) Start(ctx context.Context) error {
	err := s.initListeners()
	if err != nil {
		return err
	}

	var httpPort int
	if port, err := utils.GetPort(s.httpConn.Addr()); err == nil {
		httpPort = port
	}

	go func() {
		slog.Info("Starting HTTP server", "port", httpPort, "addr", s.httpHostPort)

		switch err := s.httpServer.Serve(s.httpConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
		default:
			slog.Error("Could not start HTTP server", errors.Attr(err))
		}
		s.unavailableChannel <- healthcheck.Unavailable
	}()

	go func() {
		slog.Info("Starting OpAmp Websocket server", "addr", constants.OpAmpWsEndpoint)
		err := s.opampServer.Start(constants.OpAmpWsEndpoint)
		if err != nil {
			slog.Error("opamp ws server failed to start", errors.Attr(err))
			s.unavailableChannel <- healthcheck.Unavailable
		}
	}()

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	if s.httpServer != nil {
		if err := s.httpServer.Shutdown(context.Background()); err != nil {
			return err
		}
	}

	s.opampServer.Stop()

	return nil
}
