package spanpercentile

import (
	"context"
	"net/http"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetSpanPercentileDetails(ctx context.Context, orgID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeResponse, error)
}

type Handler interface {
	GetSpanPercentileDetails(http.ResponseWriter, *http.Request)
}
