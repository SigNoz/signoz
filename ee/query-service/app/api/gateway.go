package api

import (
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (ah *APIHandler) ServeGatewayHTTP(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is invalid"))
		return
	}

	validPath := false
	for _, allowedPrefix := range gateway.AllowedPrefix {
		if strings.HasPrefix(req.URL.Path, gateway.RoutePrefix+allowedPrefix) {
			validPath = true
			break
		}
	}

	if !validPath {
		rw.WriteHeader(http.StatusNotFound)
		return
	}

	license, err := ah.Signoz.Licensing.GetActive(ctx, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	//Create headers
	var licenseKey string
	if license != nil {
		licenseKey = license.Key
	}

	req.Header.Set("X-Signoz-Cloud-Api-Key", licenseKey)
	req.Header.Set("X-Consumer-Username", "lid:00000000-0000-0000-0000-000000000000")
	req.Header.Set("X-Consumer-Groups", "ns:default")

	ah.Gateway().ServeHTTP(rw, req)
}
