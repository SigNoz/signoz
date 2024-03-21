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
	"errors"
	"time"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/resourcetotelemetry"
	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/confighttp"
	"go.opentelemetry.io/collector/config/configopaque"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
)

const (
	// The value of "type" key in configuration.
	typeStr = "clickhousemetricswrite"
)

var (
	writeLatencyMillis = stats.Int64("exporter_db_write_latency", "Time taken (in millis) for exporter to write batch", "ms")
	exporterKey        = tag.MustNewKey("exporter")
	tableKey           = tag.MustNewKey("table")
)

// NewFactory creates a new Prometheus Remote Write exporter.
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
		exporter.WithMetrics(createMetricsExporter, component.StabilityLevelUndefined))
}

func createMetricsExporter(ctx context.Context, set exporter.CreateSettings,
	cfg component.Config) (exporter.Metrics, error) {

	prwCfg, ok := cfg.(*Config)
	if !ok {
		return nil, errors.New("invalid configuration")
	}

	prwe, err := NewPrwExporter(prwCfg, set)
	if err != nil {
		return nil, err
	}

	// Don't support the queue.
	// See https://github.com/open-telemetry/opentelemetry-collector/issues/2949.
	// Prometheus remote write samples needs to be in chronological
	// order for each timeseries. If we shard the incoming metrics
	// without considering this limitation, we experience
	// "out of order samples" errors.
	exporter, err := exporterhelper.NewMetricsExporter(
		ctx,
		set,
		cfg,
		prwe.PushMetrics,
		exporterhelper.WithTimeout(prwCfg.TimeoutSettings),
		exporterhelper.WithQueue(exporterhelper.QueueSettings{
			Enabled:      prwCfg.RemoteWriteQueue.Enabled,
			NumConsumers: 1,
			QueueSize:    prwCfg.RemoteWriteQueue.QueueSize,
		}),
		exporterhelper.WithRetry(prwCfg.RetrySettings),
		exporterhelper.WithStart(prwe.Start),
		exporterhelper.WithShutdown(prwe.Shutdown),
	)

	if err != nil {
		return nil, err
	}

	return resourcetotelemetry.WrapMetricsExporter(prwCfg.ResourceToTelemetrySettings, exporter), nil
}

func createDefaultConfig() component.Config {
	return &Config{
		Namespace:       "",
		ExternalLabels:  map[string]string{},
		TimeoutSettings: exporterhelper.NewDefaultTimeoutSettings(),
		RetrySettings: exporterhelper.RetrySettings{
			Enabled:         true,
			InitialInterval: 50 * time.Millisecond,
			MaxInterval:     200 * time.Millisecond,
			MaxElapsedTime:  1 * time.Minute,
		},
		HTTPClientSettings: confighttp.HTTPClientSettings{
			Endpoint: "http://some.url:9411/api/prom/push",
			// We almost read 0 bytes, so no need to tune ReadBufferSize.
			ReadBufferSize:  0,
			WriteBufferSize: 512 * 1024,
			Timeout:         exporterhelper.NewDefaultTimeoutSettings().Timeout,
			Headers:         map[string]configopaque.String{},
		},
		// TODO(jbd): Adjust the default queue size.
		RemoteWriteQueue: RemoteWriteQueue{
			Enabled:      true,
			QueueSize:    10000,
			NumConsumers: 5,
		},
		WatcherInterval: 30 * time.Second,
		WriteTSToV4:     true,
	}
}
