package segmentanalytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	segment "github.com/segmentio/analytics-go/v3"
)

type logger struct {
	settings factory.ScopedProviderSettings
}

func newSegmentLogger(settings factory.ScopedProviderSettings) segment.Logger {
	return &logger{
		settings: settings,
	}
}

func (logger *logger) Logf(format string, args ...interface{}) {
	// the no lint directive is needed because the segmentlogger is not a slog.Logger
	logger.settings.Logger().InfoContext(context.TODO(), format, args...) //nolint:sloglint
}

func (logger *logger) Errorf(format string, args ...interface{}) {
	// the no lint directive is needed because the segment logger is not a slog.Logger
	logger.settings.Logger().ErrorContext(context.TODO(), format, args...) //nolint:sloglint
}
