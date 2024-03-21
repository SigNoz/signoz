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

package signoztailsampler // import "github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor"

import (
	"context"
	"sync"
	"time"

	"go.opencensus.io/stats/view"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/configtelemetry"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/processor"
)

const (
	// The value of "type" Tail Sampling in configuration.
	typeStr = "signoz_tail_sampling"
	// The stability level of the processor.
	stability = component.StabilityLevelBeta
)

var onceMetrics sync.Once

// NewFactory returns a new factory for the Tail Sampling processor.
func NewFactory() processor.Factory {
	onceMetrics.Do(func() {
		// TODO: this is hardcoding the metrics level and skips error handling
		_ = view.Register(SamplingProcessorMetricViews(configtelemetry.LevelNormal)...)
	})

	return processor.NewFactory(
		typeStr,
		createDefaultConfig,
		processor.WithTraces(createTracesProcessor, stability))
}

func createDefaultConfig() component.Config {
	return &Config{
		// ProcessorSettings: config.NewProcessorSettings(component.NewID(typeStr)),
		DecisionWait: 30 * time.Second,
		NumTraces:    50000,
	}
}

func createTracesProcessor(
	_ context.Context,
	params processor.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Traces,
) (processor.Traces, error) {
	tCfg := cfg.(*Config)
	return newTracesProcessor(params.Logger, nextConsumer, *tCfg)
}
