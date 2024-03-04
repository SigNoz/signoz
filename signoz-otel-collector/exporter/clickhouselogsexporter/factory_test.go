// Copyright 2020, OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhouselogsexporter

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/exporter/exportertest"
)

func TestCreateDefaultConfig(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	assert.NotNil(t, cfg, "failed to create default config")
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
}

// use mock clickhouse
// func TestFactory_CreateLogsExporter(t *testing.T) {
// 	factory := NewFactory()
// 	cfg := withDefaultConfig(func(cfg *Config) {
// 		cfg.DSN = defaultDSN
// 	})
// 	params := componenttest.NewNopExporterCreateSettings()
// 	exporter, err := factory.CreateLogsExporter(context.Background(), params, cfg)
// 	require.NoError(t, err)
// 	require.NotNil(t, exporter)

// 	require.NoError(t, exporter.Shutdown(context.TODO()))
// }

func TestFactory_CreateLogsExporter_Fail(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	params := exportertest.NewNopCreateSettings()
	_, err := factory.CreateLogsExporter(context.Background(), params, cfg)
	require.Error(t, err, "expected an error when creating a logs exporter")
}
