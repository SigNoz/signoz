package cmd

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/spf13/cobra"
	"github.com/swaggest/jsonschema-go"
)

const webSettingsSchemaPath = "frontend/src/schemas/generated/webSettings.schema.json"

const transactionGroupsSchemaPath = "frontend/src/schemas/generated/transactionGroups.schema.json"

func registerGenerateConfig(parentCmd *cobra.Command) {
	configCmd := &cobra.Command{
		Use:   "config",
		Short: "Generate JSON Schema for config",
	}

	configCmd.AddCommand(&cobra.Command{
		Use:   "web-settings",
		Short: "Generate JSON Schema for web settings",
		RunE: func(currCmd *cobra.Command, args []string) error {
			return generateWebSettings()
		},
	})

	configCmd.AddCommand(&cobra.Command{
		Use:   "transaction-groups",
		Short: "Generate JSON Schema for transaction groups",
		RunE: func(currCmd *cobra.Command, args []string) error {
			return generateTransactionGroups()
		},
	})

	parentCmd.AddCommand(configCmd)
}

func generateWebSettings() error {
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
		jsonschema.InterceptDefName(func(t reflect.Type, defaultDefName string) string {
			return strings.TrimPrefix(defaultDefName, "Web")
		}),
	)

	schema, err := reflector.Reflect(web.Settings{})
	if err != nil {
		return err
	}

	schema.WithTitle("WebSettings")
	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(webSettingsSchemaPath, append(data, '\n'), 0o600)
}

func generateTransactionGroups() error {
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

	schema, err := reflector.Reflect(authtypes.TransactionGroups{})
	if err != nil {
		return err
	}

	schema.WithTitle("TransactionGroups")
	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(transactionGroupsSchemaPath, append(data, '\n'), 0o600)
}
