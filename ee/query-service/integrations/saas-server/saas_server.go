package saasserver

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
)

// GetIngestionCred fetches ingestion credentials from saas server
func GetIngestionCred(tenantId string) (IngestionCred, *model.ApiError) {
	url := constants.SaasServer + "/admin/getIngestionCred?tenantId=" + tenantId
	method := "GET"

	client := &http.Client{}
	req, err := http.NewRequest(method, url, http.NoBody)

	if err != nil {
		return IngestionCred{}, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	req.Header.Add("X-signozAdminAuthKey", constants.SaasServerApiKey)

	httpResponse, err := client.Do(req)
	if err != nil {
		return IngestionCred{}, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	defer httpResponse.Body.Close()

	httpBody, err := io.ReadAll(httpResponse.Body)
	if err != nil {
		return IngestionCred{}, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	if httpResponse.StatusCode == http.StatusNotFound {
		return IngestionCred{}, &model.ApiError{Err: fmt.Errorf("TenantId not found"), Typ: model.ErrorNotFound}
	} else if httpResponse.StatusCode != http.StatusOK {
		return IngestionCred{}, &model.ApiError{Err: fmt.Errorf("Internal Error"), Typ: model.ErrorInternal}
	}
	// read api request result
	result := IngestionCred{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		return IngestionCred{}, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	return result, nil
}
