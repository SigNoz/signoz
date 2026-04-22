package tracedetail

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	Waterfall WaterfallConfig `mapstructure:"waterfall"`
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
	return factory.NewConfigFactory(factory.MustNewName("tracedetail"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Waterfall: WaterfallConfig{
			SpanPageSize:             500,
			MaxDepthToAutoExpand:     5,
			MaxLimitToSelectAllSpans: 10_000,
		},
	}
}

func (c Config) Validate() error {
	if c.Waterfall.SpanPageSize <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"tracedetail.waterfall.span_limit_per_request must be positive, got %v", c.Waterfall.SpanPageSize)
	}
	if c.Waterfall.MaxDepthToAutoExpand < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"tracedetail.waterfall.max_depth_for_selected_children cannot be negative, got %d", c.Waterfall.MaxDepthToAutoExpand)
	}
	if c.Waterfall.MaxLimitToSelectAllSpans == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"tracedetail.waterfall.max_limit_to_select_all_spans must be positive")
	}
	return nil
}
