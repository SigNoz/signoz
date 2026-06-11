package statsreporter

import (
	"context"
	"net/http"

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

type Handler interface {
	GetOrgContext(rw http.ResponseWriter, req *http.Request)
}

// OrgContextCollectors are the collectors the org context signals are sourced from.
type OrgContextCollectors struct {
	Rules      StatsCollector
	Dashboards StatsCollector
	SavedViews StatsCollector
	Licensing  StatsCollector
}
