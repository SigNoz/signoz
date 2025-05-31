package queryrange

import (
	"context"
	"net/http"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Module interface {
	QueryRange(context.Context, string, *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
}

type Handler interface {
	QueryRange(http.ResponseWriter, *http.Request)
}
