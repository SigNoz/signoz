package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.signoz.io/signoz/ee/query-service/app"
	"go.signoz.io/signoz/pkg/config"
	signozconfig "go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/provider/envprovider"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/query-service/auth"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/version"
	"go.signoz.io/signoz/pkg/signoz"
	pkgversion "go.signoz.io/signoz/pkg/version"

	prommodel "github.com/prometheus/common/model"

	"go.uber.org/zap"
)

func init() {
	prommodel.NameValidationScheme = prommodel.UTF8Validation
}

func main() {
	var promConfigPath, skipTopLvlOpsPath string

	// disables rule execution but allows change to the rule definition
	var disableRules bool

	// the url used to build link in the alert messages in slack and other systems
	var ruleRepoURL string
	var cluster string

	var useLogsNewSchema bool
	var useTraceNewSchema bool
	var cacheConfigPath, fluxInterval string
	var preferSpanMetrics bool

	var maxIdleConns int
	var maxOpenConns int
	var dialTimeout time.Duration
	var gatewayUrl string
	var useLicensesV3 bool

	flag.BoolVar(&useLogsNewSchema, "use-logs-new-schema", false, "use logs_v2 schema for logs")
	flag.BoolVar(&useTraceNewSchema, "use-trace-new-schema", false, "use new schema for traces")
	flag.StringVar(&promConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.StringVar(&skipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	flag.IntVar(&maxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool.)")
	flag.IntVar(&maxOpenConns, "max-open-conns", 100, "(max connections for use at any time.)")
	flag.DurationVar(&dialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection.)")
	flag.StringVar(&ruleRepoURL, "rules.repo-url", baseconst.AlertHelpPage, "(host address used to build rule link in alert messages)")
	flag.StringVar(&cacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	flag.StringVar(&fluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	flag.StringVar(&gatewayUrl, "gateway-url", "", "(url to the gateway)")
	flag.BoolVar(&useLicensesV3, "use-licenses-v3", false, "use licenses_v3 schema for licenses")
	flag.Parse()

	version.PrintVersion()

	config, err := signoz.NewConfig(context.Background(), signozconfig.ResolverConfig{
		Uris: []string{"env:"},
		ProviderFactories: []config.ProviderFactory{
			envprovider.NewFactory(),
		},
	})
	if err != nil {
		zap.L().Fatal("Failed to create config", zap.Error(err))
	}

	instrumentation, err := instrumentation.New(context.Background(), pkgversion.Build{}, config.Instrumentation)
	if err != nil {
		fmt.Println(err, err.Error())
		zap.L().Fatal("Failed to create instrumentation", zap.Error(err))
	}
	defer instrumentation.Stop(context.Background())

	zap.ReplaceGlobals(instrumentation.Logger())
	defer instrumentation.Logger().Sync() // flushes buffer, if any

	signoz, err := signoz.New(context.Background(), instrumentation, config, signoz.NewProviderFactories())
	if err != nil {
		zap.L().Fatal("Failed to create signoz struct", zap.Error(err))
	}

	serverOptions := &app.ServerOptions{
		HTTPHostPort:      baseconst.HTTPHostPort,
		PromConfigPath:    promConfigPath,
		SkipTopLvlOpsPath: skipTopLvlOpsPath,
		PreferSpanMetrics: preferSpanMetrics,
		PrivateHostPort:   baseconst.PrivateHostPort,
		DisableRules:      disableRules,
		RuleRepoURL:       ruleRepoURL,
		MaxIdleConns:      maxIdleConns,
		MaxOpenConns:      maxOpenConns,
		DialTimeout:       dialTimeout,
		CacheConfigPath:   cacheConfigPath,
		FluxInterval:      fluxInterval,
		Cluster:           cluster,
		GatewayUrl:        gatewayUrl,
		UseLogsNewSchema:  useLogsNewSchema,
		UseTraceNewSchema: useTraceNewSchema,
	}

	// Read the jwt secret key
	auth.JwtSecret = os.Getenv("SIGNOZ_JWT_SECRET")

	if len(auth.JwtSecret) == 0 {
		zap.L().Warn("No JWT secret key is specified.")
	} else {
		zap.L().Info("JWT secret key set successfully.")
	}

	server, err := app.NewServer(serverOptions, config, signoz)
	if err != nil {
		zap.L().Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(); err != nil {
		zap.L().Fatal("Could not start server", zap.Error(err))
	}

	if err := auth.InitAuthCache(context.Background()); err != nil {
		zap.L().Fatal("Failed to initialize auth cache", zap.Error(err))
	}

	signalsChannel := make(chan os.Signal, 1)
	signal.Notify(signalsChannel, os.Interrupt, syscall.SIGTERM)

	for {
		select {
		case status := <-server.HealthCheckStatus():
			zap.L().Info("Received HealthCheck status: ", zap.Int("status", int(status)))
		case <-signalsChannel:
			zap.L().Fatal("Received OS Interrupt Signal ... ")
			server.Stop()
		}
	}
}
