package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	_ "net/http/pprof" // http profiler
	"time"

	"github.com/gorilla/handlers"
	"github.com/jmoiron/sqlx"

	"github.com/rs/cors"
	"go.signoz.io/signoz/pkg/log"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	opAmpModel "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/app/preferences"
	"go.signoz.io/signoz/pkg/query-service/migrate"
	"go.signoz.io/signoz/pkg/registry"

	am "go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/query-service/app/explorer"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	pqle "go.signoz.io/signoz/pkg/query-service/pqlEngine"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	httprouter "go.signoz.io/signoz/pkg/router/http"
	"go.signoz.io/signoz/pkg/router/web"
	httpserver "go.signoz.io/signoz/pkg/server/http"
	"go.uber.org/zap"
)

// NewServer creates and initializes Server
func NewApiHandlerAndDBAndRulesManager(cfg Config, dbCfg dao.Config, storageCfg clickhouseReader.Config) (*APIHandler, *sqlx.DB, registry.Service, error) {
	if err := migrate.Migrate(dbCfg.Path); err != nil {
		zap.L().Error("Failed to migrate", zap.Error(err))
	} else {
		zap.L().Info("Migration successful")
	}

	if err := dao.InitDao(dbCfg); err != nil {
		return nil, nil, nil, err
	}

	if err := preferences.InitDB(dbCfg.Path); err != nil {
		return nil, nil, nil, err
	}

	localDB, err := dashboards.InitDB(dbCfg.Path)
	explorer.InitWithDSN(dbCfg.Path)

	if err != nil {
		return nil, nil, nil, err
	}

	localDB.SetMaxOpenConns(10)

	// initiate feature manager
	fm := featureManager.StartManager()

	readerReady := make(chan bool)
	zap.L().Info("Using ClickHouse as datastore ...")
	clickhouseReader := clickhouseReader.NewReader(
		storageCfg,
		localDB,
		fm,
	)
	go clickhouseReader.Start(readerReady)
	reader := clickhouseReader

	skipConfig := &model.SkipConfig{}
	if cfg.SkipTopLvlOpsPath != "" {
		// read skip config
		skipConfig, err = model.ReadSkipConfig(cfg.SkipTopLvlOpsPath)
		if err != nil {
			return nil, nil, nil, err
		}
	}

	<-readerReady
	service, err := NewRulesManager(constants.GetAlertManagerApiPrefix(), cfg.RuleRepoURL, localDB, reader, cfg.DisableRules, fm)
	if err != nil {
		return nil, nil, nil, err
	}
	rm := service.(*rules.Manager)

	go func() {
		err = migrate.ClickHouseMigrate(reader.GetConn(), cfg.Cluster)
		if err != nil {
			zap.L().Error("error while running clickhouse migrations", zap.Error(err))
		}
	}()

	var c cache.Cache
	if cfg.CacheConfigPath != "" {
		cacheOpts, err := cache.LoadFromYAMLCacheConfigFile(cfg.CacheConfigPath)
		if err != nil {
			return nil, nil, nil, err
		}
		c = cache.NewCache(cacheOpts)
	}

	fluxInterval, err := time.ParseDuration(cfg.FluxInterval)
	if err != nil {
		return nil, nil, nil, err
	}

	integrationsController, err := integrations.NewController(localDB)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("couldn't create integrations controller: %w", err)
	}

	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		localDB, "sqlite", integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, nil, nil, err
	}

	telemetry.GetInstance().SetReader(reader)
	apiHandler, err := NewAPIHandler(APIHandlerOpts{
		Reader:                        reader,
		SkipConfig:                    skipConfig,
		PreferSpanMetrics:             cfg.PreferSpanMetrics,
		MaxIdleConns:                  cfg.MaxIdleConns,
		MaxOpenConns:                  cfg.MaxOpenConns,
		DialTimeout:                   cfg.DialTimeout,
		AppDao:                        dao.DB(),
		RuleManager:                   rm,
		FeatureFlags:                  fm,
		IntegrationsController:        integrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		Cache:                         c,
		FluxInterval:                  fluxInterval,
	})
	if err != nil {
		return nil, nil, nil, err
	}

	_, err = opAmpModel.InitDB(localDB)
	if err != nil {
		return nil, nil, nil, err
	}

	if err := auth.InitAuthCache(context.Background()); err != nil {
		return nil, nil, nil, err
	}

	return apiHandler, localDB, rm, nil
}

func NewRulesManager(
	alertManagerURL string,
	ruleRepoURL string,
	db *sqlx.DB,
	ch interfaces.Reader,
	disableRules bool,
	fm interfaces.FeatureLookup,
) (registry.Service, error) {
	// create engine
	pqle, err := pqle.FromReader(ch)
	if err != nil {
		return nil, fmt.Errorf("failed to create pql engine : %v", err)
	}

	// notifier opts
	notifierOpts := am.NotifierOptions{
		QueueCapacity:    10000,
		Timeout:          1 * time.Second,
		AlertManagerURLs: []string{alertManagerURL},
	}

	// create manager opts
	managerOpts := &rules.ManagerOptions{
		NotifierOpts: notifierOpts,
		Queriers: &rules.Queriers{
			PqlEngine: pqle,
			Ch:        ch.GetConn(),
		},
		RepoURL:      ruleRepoURL,
		DBConn:       db,
		Context:      context.Background(),
		Logger:       nil,
		DisableRules: disableRules,
		FeatureFlags: fm,
		Reader:       ch,
		EvalDelay:    constants.GetEvalDelay(),
	}

	// create Manager
	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}
	zap.L().Info("rules manager is ready")

	return manager, nil
}

func NewHttpServer(logger log.Logger, cfg httpserver.Config, webRouter *web.Router, api *APIHandler) (registry.Service, error) {
	router := httprouter.NewRouter(logger)
	r := router.Sub()
	// r.Use(LogCommentEnricher)
	// r.Use(setTimeoutMiddleware)
	// r.Use(analyticsMiddleware)

	// add auth middleware
	getUserFromRequest := func(r *http.Request) (*model.UserPayload, error) {
		user, err := auth.GetUserFromRequest(r)

		if err != nil {
			return nil, err
		}

		if user.User.OrgId == "" {
			return nil, model.UnauthorizedError(errors.New("orgId is missing in the claims"))
		}

		return user, nil
	}
	am := NewAuthMiddleware(getUserFromRequest)

	api.RegisterRoutes(r, am)
	api.RegisterLogsRoutes(r, am)
	api.RegisterIntegrationRoutes(r, am)
	api.RegisterQueryRangeV3Routes(r, am)
	api.RegisterQueryRangeV4Routes(r, am)
	api.RegisterMessagingQueuesRoutes(r, am)

	// c := cors.New(cors.Options{
	// 	AllowedOrigins: []string{"*"},
	// 	AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
	// 	AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	// })

	// handler := c.Handler(r)

	// handler = handlers.CompressHandler(handler)

	web.Register(webRouter.Config(), router.Mux())
	return httpserver.New(logger, router.Handler(), cfg), nil
}

func NewHttpPrivateServer(logger log.Logger, cfg httpserver.Config, api *APIHandler) (registry.Service, error) {
	r := httprouter.NewRouter(logger).Mux()

	// r.Use(setTimeoutMiddleware)
	// r.Use(analyticsMiddleware)

	api.RegisterPrivateRoutes(r)

	c := cors.New(cors.Options{
		//todo(amol): find out a way to add exact domain or
		// ip here for alert manager
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return httpserver.New(logger, handler, cfg), nil
}

func NewOpampServer(logger log.Logger, cfg opamp.Config, db *sqlx.DB, api *APIHandler) (registry.Service, error) {
	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		DB:       db,
		DBEngine: "sqlite",
		AgentFeatures: []agentConf.AgentFeature{
			api.LogsParsingPipelineController,
		},
	})
	if err != nil {
		return nil, err
	}

	return opamp.New(&opAmpModel.AllAgents, agentConfMgr, cfg), nil
}
