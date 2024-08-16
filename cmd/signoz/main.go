package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"go.signoz.io/signoz/pkg/cfg"
	"go.signoz.io/signoz/pkg/log"
	"go.signoz.io/signoz/pkg/log/zap"
	"go.signoz.io/signoz/pkg/otel"
	"go.signoz.io/signoz/pkg/registry"
	"go.signoz.io/signoz/pkg/server/http"
)

func main() {
	var logConfig log.Config
	var httpConfig http.Config

	var logger log.Logger
	otelShutdowns := make([]otel.Shutdown, 2)

	app := &cobra.Command{
		Use:          "signoz",
		SilenceUsage: true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			cfg.Set(cmd, "signoz")
			return nil
		},
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

			return run(ctx, logger, httpConfig)
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
	logConfig.RegisterFlags(app.Flags())
	httpConfig.RegisterFlags(app.Flags())

	if err := app.Execute(); err != nil {
		os.Exit(1)
	}
}

func run(
	ctx context.Context,
	logger log.Logger,
	httpConfig http.Config,
) error {
	var services []registry.Service

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
