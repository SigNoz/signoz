package export

import (
	"context"
	"net/http"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Export(ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest) (chan *qbtypes.RawRow, chan error)
}

type Handler interface {
	Export(http.ResponseWriter, *http.Request)
}
