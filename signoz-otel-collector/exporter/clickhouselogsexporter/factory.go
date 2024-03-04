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
	"fmt"

	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
)

const (
	// The value of "type" key in configuration.
	typeStr          = "clickhouselogsexporter"
	primaryNamespace = "clickhouselogs"
	archiveNamespace = "clickhouselogs-archive"
	databaseName     = "signoz_logs"
	tableName        = "logs"
	migrationsFolder = "./migrations"
)

var (
	writeLatencyMillis = stats.Int64("exporter_db_write_latency", "Time taken (in millis) for exporter to write batch", "ms")
	exporterKey        = tag.MustNewKey("exporter")
	tableKey           = tag.MustNewKey("table")
)

// NewFactory creates a factory for Elastic exporter.
func NewFactory() exporter.Factory {
	writeLatencyDistribution := view.Distribution(100, 250, 500, 750, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000)

	writeLatencyView := &view.View{
		Name:        "exporter_db_write_latency",
		Measure:     writeLatencyMillis,
		Description: writeLatencyMillis.Description(),
		TagKeys:     []tag.Key{exporterKey, tableKey},
		Aggregation: writeLatencyDistribution,
	}

	view.Register(writeLatencyView)

	return exporter.NewFactory(
		typeStr,
		createDefaultConfig,
		exporter.WithLogs(createLogsExporter, component.StabilityLevelBeta),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		TimeoutSettings: exporterhelper.NewDefaultTimeoutSettings(),
		QueueSettings:   exporterhelper.NewDefaultQueueSettings(),
		RetrySettings:   exporterhelper.NewDefaultRetrySettings(),
	}
}

// createLogsExporter creates a new exporter for logs.
// Logs are directly insert into clickhouse.
func createLogsExporter(
	ctx context.Context,
	set exporter.CreateSettings,
	cfg component.Config,
) (exporter.Logs, error) {
	c := cfg.(*Config)
	exporter, err := newExporter(set.Logger, c)
	if err != nil {
		return nil, fmt.Errorf("cannot configure clickhouse logs exporter: %w", err)
	}

	return exporterhelper.NewLogsExporter(
		ctx,
		set,
		cfg,
		exporter.pushLogsData,
		exporterhelper.WithShutdown(exporter.Shutdown),
		exporterhelper.WithTimeout(c.TimeoutSettings),
		exporterhelper.WithQueue(c.QueueSettings),
		exporterhelper.WithRetry(c.RetrySettings),
	)
}
