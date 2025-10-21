package spanpercentile

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetSpanPercentileDetails(ctx context.Context, orgID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*spanpercentiletypes.SpanPercentileResponse, error)
}

type Handler interface {
	GetSpanPercentileDetails(http.ResponseWriter, *http.Request)
}
