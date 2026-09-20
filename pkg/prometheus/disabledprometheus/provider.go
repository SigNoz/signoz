// Package disabledprometheus rejects PromQL on stores without a PromQL backend.
package disabledprometheus

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type provider struct{}

func New(_ factory.ProviderSettings, _ prometheus.Config) prometheus.Prometheus {
	return &provider{}
}

func (*provider) QueryRange(context.Context, string, time.Time, time.Time, time.Duration) (*prometheus.Result, error) {
	return nil, telemetrystore.Unsupported("PromQL")
}

func (*provider) Query(context.Context, string, time.Time) (*prometheus.Result, error) {
	return nil, telemetrystore.Unsupported("PromQL")
}

func (*provider) Statements(context.Context, string, time.Time, time.Time, time.Duration) ([]prometheus.CapturedStatement, error) {
	return nil, telemetrystore.Unsupported("PromQL")
}
