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

package clickhousetracesexporter

import (
	"context"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
)

const (
	// The value of "type" key in configuration.
	typeStr          = "clickhousetraces"
	primaryNamespace = "clickhouse"
	archiveNamespace = "clickhouse-archive"
)

func createDefaultConfig() component.Config {
	return &Config{
		TimeoutSettings: exporterhelper.NewDefaultTimeoutSettings(),
		QueueSettings:   exporterhelper.NewDefaultQueueSettings(),
		RetrySettings:   exporterhelper.NewDefaultRetrySettings(),
	}
}

// NewFactory creates a factory for Logging exporter
func NewFactory() exporter.Factory {
	return exporter.NewFactory(
		typeStr,
		createDefaultConfig,
		exporter.WithTraces(createTracesExporter, component.StabilityLevelUndefined),
	)
}

func createTracesExporter(
	ctx context.Context,
	params exporter.CreateSettings,
	cfg component.Config,
) (exporter.Traces, error) {

	c := cfg.(*Config)
	oce, err := newExporter(cfg, params.Logger)
	if err != nil {
		return nil, err
	}

	return exporterhelper.NewTracesExporter(
		ctx,
		params,
		cfg,
		oce.pushTraceData,
		exporterhelper.WithShutdown(oce.Shutdown),
		exporterhelper.WithTimeout(c.TimeoutSettings),
		exporterhelper.WithQueue(c.QueueSettings),
		exporterhelper.WithRetry(c.RetrySettings))
}
