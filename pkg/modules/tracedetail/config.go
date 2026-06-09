package tracedetail

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	Waterfall  WaterfallConfig  `mapstructure:"waterfall"`
	Flamegraph FlamegraphConfig `mapstructure:"flamegraph"`
}

type FlamegraphConfig struct {
	MaxSelectedLevels            int  `mapstructure:"max_selected_levels"`
	MaxSpansPerLevel             int  `mapstructure:"max_spans_per_level"`
	SamplingTopLatencySpansCount int  `mapstructure:"sampling_top_latency_count"`
	SamplingBucketCount          int  `mapstructure:"sampling_bucket_count"`
	SelectAllSpansLimit          uint `mapstructure:"select_all_spans_limit"`
}

type WaterfallConfig struct {
	// SpanPageSize is the window size of spans returned per request.
	SpanPageSize float64 `mapstructure:"span_page_size"`
	// MaxDepthToAutoExpand is the depth of auto-expanded descendants below selectedSpanID.
	MaxDepthToAutoExpand int `mapstructure:"max_depth_to_auto_expand"`
	// MaxLimitToSelectAllSpans is the threshold below which all spans are returned without windowing.
	MaxLimitToSelectAllSpans uint `mapstructure:"max_limit_to_select_all_spans"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("traces"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Waterfall: WaterfallConfig{
			SpanPageSize:             500,
			MaxDepthToAutoExpand:     5,
			MaxLimitToSelectAllSpans: 10_000,
		},
		Flamegraph: FlamegraphConfig{
			MaxSelectedLevels:            50,
			MaxSpansPerLevel:             100,
			SamplingTopLatencySpansCount: 5,
			SamplingBucketCount:          50,
			SelectAllSpansLimit:          100_000,
		},
	}
}

func (c Config) Validate() error {
	if c.Waterfall.SpanPageSize <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.waterfall.span_limit_per_request must be positive, got %v", c.Waterfall.SpanPageSize)
	}
	if c.Waterfall.MaxDepthToAutoExpand < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.waterfall.max_depth_for_selected_children cannot be negative, got %d", c.Waterfall.MaxDepthToAutoExpand)
	}
	if c.Waterfall.MaxLimitToSelectAllSpans == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.waterfall.max_limit_to_select_all_spans must be positive")
	}
	if c.Flamegraph.MaxSelectedLevels <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.flamegraph.max_selected_levels must be positive, got %d", c.Flamegraph.MaxSelectedLevels)
	}
	if c.Flamegraph.MaxSpansPerLevel <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.flamegraph.max_spans_per_level must be positive, got %d", c.Flamegraph.MaxSpansPerLevel)
	}
	if c.Flamegraph.SamplingTopLatencySpansCount < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.flamegraph.sampling_top_latency_count cannot be negative, got %d", c.Flamegraph.SamplingTopLatencySpansCount)
	}
	if c.Flamegraph.SamplingBucketCount <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.flamegraph.sampling_bucket_count must be positive, got %d", c.Flamegraph.SamplingBucketCount)
	}
	if c.Flamegraph.SelectAllSpansLimit == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "traces.flamegraph.select_all_spans_limit must be positive")
	}
	return nil
}
