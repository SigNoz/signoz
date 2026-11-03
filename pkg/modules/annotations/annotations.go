package annotations

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	ListAnnotations(http.ResponseWriter, *http.Request)
}

type Module interface {
	statsreporter.StatsCollector
	ListAnnotations(ctx context.Context, orgID valuer.UUID, req *annotationtypes.PostableAnnotations) (*annotationtypes.Annotations, error)
}
