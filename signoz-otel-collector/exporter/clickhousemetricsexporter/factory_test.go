// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhousemetricsexporter

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/config/confighttp"
	"go.opentelemetry.io/collector/config/configtls"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exportertest"
)

// Tests whether or not the default Exporter factory can instantiate a properly interfaced Exporter with default conditions
func Test_createDefaultConfig(t *testing.T) {
	cfg := createDefaultConfig()
	assert.NotNil(t, cfg, "failed to create default config")
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
}

// Tests whether or not a correct Metrics Exporter from the default Config parameters
// FIXME(srikanthccv): Enable the tests once this issue is fixed: https://github.com/SigNoz/signoz-otel-collector/issues/65
func skip_Test_createMetricsExporter(t *testing.T) {

	invalidConfig := createDefaultConfig().(*Config)
	invalidConfig.HTTPClientSettings = confighttp.HTTPClientSettings{}
	invalidTLSConfig := createDefaultConfig().(*Config)
	invalidTLSConfig.HTTPClientSettings.TLSSetting = configtls.TLSClientSetting{
		TLSSetting: configtls.TLSSetting{
			CAFile:   "non-existent file",
			CertFile: "",
			KeyFile:  "",
		},
		Insecure:   false,
		ServerName: "",
	}
	tests := []struct {
		name                string
		cfg                 component.Config
		set                 exporter.CreateSettings
		returnErrorOnCreate bool
		returnErrorOnStart  bool
	}{
		{"success_case",
			createDefaultConfig(),
			exportertest.NewNopCreateSettings(),
			false,
			false,
		},
		{"fail_case",
			nil,
			exportertest.NewNopCreateSettings(),
			true,
			false,
		},
		{"invalid_config_case",
			invalidConfig,
			exportertest.NewNopCreateSettings(),
			true,
			false,
		},
		{"invalid_tls_config_case",
			invalidTLSConfig,
			exportertest.NewNopCreateSettings(),
			false,
			true,
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exp, err := createMetricsExporter(context.Background(), tt.set, tt.cfg)
			if tt.returnErrorOnCreate {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.NotNil(t, exp)
			err = exp.Start(context.Background(), componenttest.NewNopHost())
			if tt.returnErrorOnStart {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
