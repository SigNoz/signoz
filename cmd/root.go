package cmd

import (
	"log/slog"
	"os"

	"github.com/SigNoz/signoz/pkg/version"
	"github.com/spf13/cobra"
)

var RootCmd = &cobra.Command{
	Use:               "signoz",
	Short:             "OpenTelemetry-Native Logs, Metrics and Traces in a single pane",
	Version:           version.Info.Version(),
	SilenceUsage:      true,
	SilenceErrors:     true,
	CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
}

func Execute(logger *slog.Logger) {
	err := RootCmd.Execute()
	if err != nil {
		logger.ErrorContext(RootCmd.Context(), "error running command", "error", err)
		os.Exit(1)
	}
}
