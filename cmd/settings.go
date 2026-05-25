package cmd

import (
	"encoding/json"
	"os"
	"reflect"

	"github.com/SigNoz/signoz/pkg/web"
	"github.com/spf13/cobra"
	"github.com/swaggest/jsonschema-go"
)

const webSettingsSchemaPath = "docs/settings/web.json"

func registerGenerateSettings(parentCmd *cobra.Command) {
	settingsCmd := &cobra.Command{
		Use:   "settings",
		Short: "Generate JSON Schema for settings",
	}

	settingsCmd.AddCommand(&cobra.Command{
		Use:   "web",
		Short: "Generate JSON Schema for web settings",
		RunE: func(currCmd *cobra.Command, args []string) error {
			return runGenerateWebSettings()
		},
	})

	parentCmd.AddCommand(settingsCmd)
}

func runGenerateWebSettings() error {
	falseVal := false
	noAdditional := jsonschema.SchemaOrBool{TypeBoolean: &falseVal}

	reflector := jsonschema.Reflector{}
	reflector.DefaultOptions = append(reflector.DefaultOptions,
		jsonschema.InterceptSchema(func(params jsonschema.InterceptSchemaParams) (bool, error) {
			if params.Value.Kind() == reflect.Struct {
				params.Schema.AdditionalProperties = &noAdditional
			}
			return false, nil
		}),
	)

	schema, err := reflector.Reflect(web.Settings{})
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(webSettingsSchemaPath, append(data, '\n'), 0o600)
}
