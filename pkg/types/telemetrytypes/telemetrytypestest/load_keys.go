package telemetrytypestest

import (
	"encoding/json"
	"os"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// LoadFieldKeysFromJSON loads telemetry field keys from a JSON file
func LoadFieldKeysFromJSON(filePath string) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	jsonData, err := os.ReadFile(filePath)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to read JSON file")
	}

	var result map[string][]*telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal(jsonData, &result); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to unmarshal JSON")
	}

	return result, nil
}

// LoadFieldKeysFromJSONString loads telemetry field keys from a JSON string
func LoadFieldKeysFromJSONString(jsonStr string) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	var result map[string][]*telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to unmarshal JSON")
	}

	return result, nil
}
