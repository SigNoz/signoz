package api

import (
	"net/http"
	"strings"

	"go.signoz.io/signoz/ee/query-service/integrations/gateway"
)

func (ah *APIHandler) ServeGatewayHTTP(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
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

	license, err := ah.LM().GetRepo().GetActiveLicense(ctx)
	if err != nil {
		RespondError(rw, err, nil)
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
