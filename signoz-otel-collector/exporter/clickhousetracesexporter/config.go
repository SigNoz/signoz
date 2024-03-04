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
	"fmt"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter/exporterhelper"
)

// Config defines configuration for tracing exporter.
type Config struct {
	Options    `mapstructure:",squash"`
	Datasource string `mapstructure:"datasource"`
	Migrations string `mapstructure:"migrations"`
	// Docker Multi Node Cluster is a flag to enable the docker multi node cluster. Default is false.
	DockerMultiNodeCluster bool `mapstructure:"docker_multi_node_cluster"`
	// LowCardinalExceptionGrouping is a flag to enable exception grouping by serviceName + exceptionType. Default is false.
	LowCardinalExceptionGrouping   bool `mapstructure:"low_cardinal_exception_grouping"`
	exporterhelper.TimeoutSettings `mapstructure:",squash"`
	exporterhelper.RetrySettings   `mapstructure:"retry_on_failure"`
	exporterhelper.QueueSettings   `mapstructure:"sending_queue"`
}

var _ component.Config = (*Config)(nil)

// Validate checks if the exporter configuration is valid
func (cfg *Config) Validate() error {
	if cfg.QueueSettings.QueueSize < 0 {
		return fmt.Errorf("remote write queue size can't be negative")
	}

	if cfg.QueueSettings.Enabled && cfg.QueueSettings.QueueSize == 0 {
		return fmt.Errorf("a 0 size queue will drop all the data")
	}

	if cfg.QueueSettings.NumConsumers < 0 {
		return fmt.Errorf("remote write consumer number can't be negative")
	}
	return nil
}
