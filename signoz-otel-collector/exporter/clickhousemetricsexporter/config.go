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
	"fmt"
	"time"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/resourcetotelemetry"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/confighttp"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
)

// Config defines configuration for Remote Write exporter.
type Config struct {
	exporterhelper.TimeoutSettings `mapstructure:",squash"` // squash ensures fields are correctly decoded in embedded struct.
	exporterhelper.RetrySettings   `mapstructure:"retry_on_failure"`
	// QueueConfig allows users to fine tune the queues
	// that handle outgoing requests.
	RemoteWriteQueue RemoteWriteQueue `mapstructure:"remote_write_queue"`
	// prefix attached to each exported metric name
	// See: https://prometheus.io/docs/practices/naming/#metric-names
	Namespace string `mapstructure:"namespace"`

	// ExternalLabels defines a map of label keys and values that are allowed to start with reserved prefix "__"
	ExternalLabels map[string]string `mapstructure:"external_labels"`

	HTTPClientSettings confighttp.HTTPClientSettings `mapstructure:",squash"` // squash ensures fields are correctly decoded in embedded struct.

	// ResourceToTelemetrySettings is the option for converting resource attributes to telemetry attributes.
	// "Enabled" - A boolean field to enable/disable this option. Default is `false`.
	// If enabled, all the resource attributes will be converted to metric labels by default.
	ResourceToTelemetrySettings resourcetotelemetry.Settings `mapstructure:"resource_to_telemetry_conversion"`

	WatcherInterval time.Duration `mapstructure:"watcher_interval"`

	WriteTSToV4 bool `mapstructure:"write_ts_to_v4"`
}

// RemoteWriteQueue allows to configure the remote write queue.
type RemoteWriteQueue struct {
	// Enabled if false the queue is not enabled, the export requests
	// are executed synchronously.
	Enabled bool `mapstructure:"enabled"`

	// QueueSize is the maximum number of OTLP metric batches allowed
	// in the queue at a given time. Ignored if Enabled is false.
	QueueSize int `mapstructure:"queue_size"`

	// NumWorkers configures the number of workers used by
	// the collector to fan out remote write requests.
	NumConsumers int `mapstructure:"num_consumers"`
}

var _ component.Config = (*Config)(nil)

// Validate checks if the exporter configuration is valid
func (cfg *Config) Validate() error {
	if cfg.RemoteWriteQueue.QueueSize < 0 {
		return fmt.Errorf("remote write queue size can't be negative")
	}

	if cfg.RemoteWriteQueue.Enabled && cfg.RemoteWriteQueue.QueueSize == 0 {
		return fmt.Errorf("a 0 size queue will drop all the data")
	}

	if cfg.RemoteWriteQueue.NumConsumers < 0 {
		return fmt.Errorf("remote write consumer number can't be negative")
	}
	return nil
}
