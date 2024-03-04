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

package signozspanmetricsprocessor

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tilinna/clock"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/processor"
	semconv "go.opentelemetry.io/collector/semconv/v1.13.0"
)

const (
	// The value of "type" key in configuration.
	typeStr = "signozspanmetrics"
	// The stability level of the processor.
	stability = component.StabilityLevelBeta
)

// NewFactory creates a factory for the spanmetrics processor.
func NewFactory() processor.Factory {
	return processor.NewFactory(
		typeStr,
		createDefaultConfig,
		processor.WithTraces(createTracesProcessor, stability),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		AggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
		DimensionsCacheSize:    defaultDimensionsCacheSize,
		skipSanitizeLabel:      dropSanitizationFeatureGate.IsEnabled(),
		MetricsFlushInterval:   60 * time.Second,
		EnableExpHistogram:     false,
	}
}

func createTracesProcessor(ctx context.Context, params processor.CreateSettings, cfg component.Config, nextConsumer consumer.Traces) (processor.Traces, error) {
	var instanceID string
	serviceInstanceId, ok := params.Resource.Attributes().Get(semconv.AttributeServiceInstanceID)
	if ok {
		instanceID = serviceInstanceId.AsString()
	} else {
		instanceUUID, _ := uuid.NewRandom()
		instanceID = instanceUUID.String()
	}
	p, err := newProcessor(params.Logger, instanceID, cfg, metricsTicker(ctx, cfg))
	if err != nil {
		return nil, err
	}
	p.tracesConsumer = nextConsumer
	return p, nil
}

func metricsTicker(ctx context.Context, cfg component.Config) *clock.Ticker {
	return clock.FromContext(ctx).NewTicker(cfg.(*Config).MetricsFlushInterval)
}
