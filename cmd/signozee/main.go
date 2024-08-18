package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/usage"
	"go.signoz.io/signoz/pkg/cfg"
	"go.signoz.io/signoz/pkg/log"
	"go.signoz.io/signoz/pkg/log/zap"
	"go.signoz.io/signoz/pkg/otel"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/registry"
	"go.signoz.io/signoz/pkg/router/web"
	"go.signoz.io/signoz/pkg/server/http"
	sdkzap "go.uber.org/zap"
)

func main() {
	var logConfig log.Config
	var appConfig app.Config
	var httpConfig http.Config
	var webConfig web.Config
	var dbConfig dao.Config
	var storageConfig clickhouseReader.Config

	var logger log.Logger
	otelShutdowns := make([]otel.Shutdown, 2)

	mlogger, err := zap.NewLogger("info")
	if err != nil {
		panic(err)
	}

	app := &cobra.Command{
		Use:          "signoz",
		SilenceUsage: true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			cfg.Set(cmd, "signoz")
			return nil
		},
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			// Initialize the logger
			logger, err := zap.NewLogger(logConfig.LogLevel)
			if err != nil {
				return err
			}
			logger.Debugctx(ctx, "initialized logger", "level", logConfig.LogLevel)

			// Initialize opentelemetry resources
			resource, err := otel.NewResource(ctx)
			if err != nil {
				return err
			}

			// Initialize opentelemetry tracer
			shutdownTracer, err := otel.NewTracerProvider(ctx, resource)
			if err != nil {
				return err
			}
			// Add the tracer to the array of shutdowns
			otelShutdowns = append(otelShutdowns, shutdownTracer)
			logger.Debugctx(ctx, "initialized tracer")

			// Initialize opentelemetry meter
			shutdownMeter, err := otel.NewMeterProvider(ctx, resource)
			if err != nil {
				return err
			}
			// Add the meter to the array of shutdowns
			otelShutdowns = append(otelShutdowns, shutdownMeter)
			logger.Debugctx(ctx, "initialized meter")

			return run(ctx, logger, appConfig, httpConfig, webConfig, dbConfig, storageConfig)
		},
		PostRunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			var perr error

			for _, otelShutdown := range otelShutdowns {
				err := otelShutdown(ctx)
				if err != nil {
					logger.Errorctx(ctx, "unable to shutdown", err)
					perr = err
				}
			}

			logger.Flush()
			return perr
		},
	}

	// register a list of flags for the application
	appConfig.RegisterFlags(app.Flags())
	logConfig.RegisterFlags(app.Flags())
	httpConfig.RegisterFlags(app.Flags())
	webConfig.RegisterFlags(app.Flags())
	dbConfig.RegisterFlags(app.Flags())
	storageConfig.RegisterFlags(app.Flags())

	if err := app.Execute(); err != nil {
		mlogger.Error("failed to run signoz", err)
		os.Exit(1)
	}
}

func run(
	ctx context.Context,
	logger log.Logger,
	appConfig app.Config,
	httpConfig http.Config,
	webConfig web.Config,
	dbConfig dao.Config,
	storageConfig clickhouseReader.Config,
) error {
	var services []registry.Service
	// Initialize the global logger
	sdkzap.ReplaceGlobals(logger.Getl())

	// Initialize the web router
	webRouter, err := web.NewRouter(webConfig)
	if err != nil {
		return err
	}

	// Initialize the ApiHandler which has a set of dependencies needed by all services
	// It all creates the rulesmanager service.
	apiHandler, db, rulesManager, err := app.NewApiHandlerAndDBAndRulesManager(appConfig, dbConfig, storageConfig)
	if err != nil {
		return err
	}
	services = append(services, rulesManager)

	// Create http server
	httpServer, err := app.NewHttpServer(logger, httpConfig, webRouter, apiHandler)
	if err != nil {
		return err
	}
	services = append(services, httpServer)

	// Create private http server
	httpPrivateServer, err := app.NewHttpPrivateServer(logger, http.Config{ListenAddress: "0.0.0.0:8085"}, apiHandler)
	if err != nil {
		return err
	}
	services = append(services, httpPrivateServer)

	// Create opamp server
	opampServer, err := app.NewOpampServer(logger, opamp.Config{ListenAddress: "0.0.0.0:4320"}, db, apiHandler)
	if err != nil {
		return err
	}
	services = append(services, opampServer)

	// Create the license manager
	lm, err := license.StartManager("sqlite", db)
	if err != nil {
		return err
	}
	// set license manager as feature flag provider in dao
	modelDao.SetFlagProvider(lm)

	// Create the usage manager
	usageManager, err := usage.New("sqlite", modelDao, lm.GetRepo(), reader.GetConn())
	if err != nil {
		return err
	}

	registry, err := registry.NewRegistry(services...)
	if err != nil {
		return err
	}

	err = registry.Start(ctx)
	if err != nil {
		return err
	}

	wait(ctx, logger)
	err = registry.Stop(ctx)
	if err != nil {
		return err
	}

	return nil
}

// Wait blocks on an interrupt signal or a context completion.
// It logs the reason and exits.
func wait(ctx context.Context, logger log.Logger) {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-ctx.Done():
		logger.Infoctx(ctx, fmt.Sprintf("caught context error %s, exiting", ctx.Err().Error()))
	case s := <-interrupt:
		logger.Infoctx(ctx, fmt.Sprintf("caught signal %s, exiting", s.String()))
	}

}
