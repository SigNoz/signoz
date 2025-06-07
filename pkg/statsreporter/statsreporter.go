package statsreporter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type StatsReporter interface {
	factory.Service

	Report(context.Context) error
}

type StatsCollector interface {
	Collect(context.Context, valuer.UUID) (map[string]any, error)
}
