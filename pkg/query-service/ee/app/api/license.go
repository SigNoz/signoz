package api

import (
	"context"
	"encoding/json"
	"fmt"
	"go.signoz.io/query-service/ee/model"
	"net/http"
)

func (ah *APIHandler) listLicenses(w http.ResponseWriter, r *http.Request) {
	licenses, apiError := ah.LM().GetLicenses(context.Background())
	if apiError != nil {
		RespondError(w, apiError, nil)
	}
	ah.Respond(w, licenses)
}

func (ah *APIHandler) applyLicense(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var l model.License

	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	if l.Key == "" {
		RespondError(w, model.BadRequest(fmt.Errorf("license key is required")), nil)
		return
	}

	license, apiError := ah.LM().Activate(ctx, l.Key)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	ah.Respond(w, license)
}
