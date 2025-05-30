package telemetrytypestest

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// LoadFieldKeysFromJSON loads telemetry field keys from a JSON file
func LoadFieldKeysFromJSON(filePath string) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	// Read the JSON file
	jsonData, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read JSON file: %w", err)
	}

	// Parse JSON directly into the target format using built-in unmarshaling
	var result map[string][]*telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal(jsonData, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return result, nil
}

// LoadFieldKeysFromJSONString loads telemetry field keys from a JSON string
func LoadFieldKeysFromJSONString(jsonStr string) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	// Parse JSON directly into the target format using built-in unmarshaling
	var result map[string][]*telemetrytypes.TelemetryFieldKey
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return result, nil
}
