package otelconfig

import (
	"os"
	"strings"
	"testing"
)

func readYAMLFile(t *testing.T, filePath string) []byte {
	contents, err := os.ReadFile(filePath)
	if err != nil {
		t.Errorf("failed to read file: %v", err)
	}
	return contents
}

func TestConfigParse(t *testing.T) {
	configCases := []struct {
		name    string
		content []byte
		err     bool
		errMsg  string
	}{
		{
			name:    "invalid config",
			content: readYAMLFile(t, "testdata/config_parser/invalid.yaml"),
			err:     true,
			errMsg:  "cannot unmarshal the configuration",
		},
		{
			name:    "simple valid config",
			content: readYAMLFile(t, "testdata/config_parser/simple_config.yaml"),
			err:     false,
		},
		{
			name:    "valid config with SigNoz components",
			content: readYAMLFile(t, "testdata/config_parser/signoz_components.yaml"),
			err:     false,
		},
	}

	for _, tc := range configCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Parse(tc.content)
			if tc.err {
				if err == nil {
					t.Error("expected error, got nil")
				}
				if !strings.Contains(err.Error(), tc.errMsg) {
					t.Errorf("expected error message to contain %q, got %q", tc.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
			}
		})
	}
}
