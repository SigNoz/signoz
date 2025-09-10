package rawdataexport

import (
	"context"
	"net/http"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	ExportRawData(ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, doneChan chan any) (chan *qbtypes.RawRow, chan error)
}

type Handler interface {
	ExportRawData(http.ResponseWriter, *http.Request)
}
