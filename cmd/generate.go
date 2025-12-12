package cmd

import (
	"log/slog"

	"github.com/spf13/cobra"
)

func RegisterGenerate(parentCmd *cobra.Command, logger *slog.Logger) {
	var generateCmd = &cobra.Command{
		Use:               "generate",
		Short:             "Generate artifacts",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerGenerateOpenAPI(generateCmd)

	parentCmd.AddCommand(generateCmd)
}
