package signozstatsreporterapi

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	orgContext *orgContext
}

func NewHandler(telemetryStore telemetrystore.TelemetryStore, collectors statsreporter.OrgContextCollectors) statsreporter.Handler {
	return &handler{orgContext: newOrgContext(telemetryStore, collectors)}
}

func (h *handler) GetOrgContext(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.orgContext.Get(req.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}
