package cmd

import (
	"context"
	"log/slog"
	"os"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/apiserver/signozapiserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/spf13/cobra"
	"github.com/swaggest/openapi-go"
	"github.com/swaggest/openapi-go/openapi3"
)

func registerGenerateOpenAPI(parentCmd *cobra.Command, logger *slog.Logger) {
	openapiCmd := &cobra.Command{
		Use:   "openapi",
		Short: "Generate OpenAPI schema for SigNoz",
		RunE: func(currCmd *cobra.Command, args []string) error {
			return runGenerateOpenAPI(currCmd.Context(), logger)
		},
	}

	parentCmd.AddCommand(openapiCmd)
}

func runGenerateOpenAPI(ctx context.Context, logger *slog.Logger) error {
	refl := openapi3.NewReflector()
	refl.SpecSchema().SetTitle("SigNoz")
	refl.SpecSchema().SetDescription("OpenTelemetry-Native Logs, Metrics and Traces in a single pane")
	refl.SpecSchema().SetAPIKeySecurity("X-API-Key", "SigNoz-Api-Key", openapi.InHeader, "API Key")

	collector := handler.NewOpenAPICollector(refl)

	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, instrumentation.Config{}, version.Info, "signoz")
	if err != nil {
		return err
	}

	apiserver, err := signozapiserver.NewProviderFactory(struct{ organization.Getter }{}, struct{ authz.AuthZ }{}, struct{ organization.Handler }{}).New(ctx, instrumentation.ToProviderSettings(), apiserver.Config{})
	if err != nil {
		return err
	}

	if err := apiserver.Router().Walk(collector.Walker); err != nil {
		return err
	}

	spec, err := refl.Spec.MarshalYAML()
	if err != nil {
		return err
	}

	if err := os.WriteFile("docs/api/openapi.yml", spec, 0o600); err != nil {
		return err
	}

	return nil
}
