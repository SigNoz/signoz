package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type CloudAccountConnectionParamsResponse struct {
	IngestionUrl string `json:"ingestion_url,omitempty"`
	IngestionKey string `json:"ingestion_key,omitempty"`
}

// Get or create credentials and params needed for connecting an AWS account
// for SigNoz AWS integration.
//
// Returns all params that could be deduced or generated.
func (ah *APIHandler) CloudIntegrationsGenerateConnectionParams(w http.ResponseWriter, r *http.Request) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	if cloudProvider != "aws" {
		RespondError(w, basemodel.InternalError(fmt.Errorf(
			"cloud provider not supported: %s", cloudProvider,
		)), nil)
		return
	}

	license, err := ah.LM().GetRepo().GetActiveLicense(r.Context())
	if err != nil {
		RespondError(w, basemodel.InternalError(fmt.Errorf(
			"couldn't look for active license: %w", err,
		)), nil)
		return
	}

	if license == nil {
		// nothing to return if no license found.
		ah.Respond(w, CloudAccountConnectionParamsResponse{})
		return
	}

	gatewayUrl := ah.opts.GatewayUrl
	if len(gatewayUrl) < 1 {
		// nothing to return if no gateway has been configured.
		ah.Respond(w, CloudAccountConnectionParamsResponse{})
		return
	}

	ingestionKey, err := getOrCreateCloudProviderIngestionKey(
		gatewayUrl, license.Key, cloudProvider,
	)
	if err != nil {
		RespondError(w, basemodel.InternalError(fmt.Errorf(
			"couldn't get or create ingestion key: %w", err,
		)), nil)
		return
	}

	result := CloudAccountConnectionParamsResponse{
		IngestionKey: ingestionKey,
	}

	// construct ingestion URL

	ah.Respond(w, result)
}

type ingestionKey struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ingestionKeysSearchResult struct {
	Status string         `json:"status"`
	Data   []ingestionKey `json:"data"`
	Error  string         `json:"error"`
}

type createIngestionKeyResult struct {
	Status string       `json:"status"`
	Data   ingestionKey `json:"data"`
	Error  string       `json:"error"`
}

func getOrCreateCloudProviderIngestionKey(gatewayUrl string, licenseKey string, cloudProvider string) (string, *basemodel.ApiError) {
	cloudProviderKeyName := fmt.Sprintf("%s-integration", cloudProvider)

	// see if the key already exists
	searchResult, apiErr := requestGateway[ingestionKeysSearchResult](
		gatewayUrl,
		licenseKey,
		fmt.Sprintf("/v1/workspaces/me/keys/search?name=%s", cloudProviderKeyName),
		nil,
	)

	if apiErr != nil {
		return "", basemodel.WrapApiError(
			apiErr, "couldn't search for cloudprovider ingestion key",
		)
	}

	if searchResult.Status != "success" {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't search for cloudprovider ingestion key: status: %s, error: %s",
			searchResult.Status, searchResult.Error,
		))
	}

	for _, k := range searchResult.Data {
		if k.Name == cloudProviderKeyName {
			return k.Value, nil
		}
	}

	// create a key and return it if one doesn't already exist
	createKeyResult, apiErr := requestGateway[createIngestionKeyResult](
		gatewayUrl, licenseKey, "/v1/workspaces/me/keys",
		map[string]any{
			"name": cloudProviderKeyName,
			"tags": []string{"integration", cloudProvider},
		},
	)
	if apiErr != nil {
		return "", basemodel.WrapApiError(
			apiErr, "couldn't create cloudprovider ingestion key",
		)
	}

	if createKeyResult.Status != "success" {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't create cloudprovider ingestion key: status: %s, error: %s",
			createKeyResult.Status, createKeyResult.Error,
		))
	}

	return createKeyResult.Data.Value, nil
}

func requestGateway[ResponseType any](
	gatewayUrl string, licenseKey string, path string, payload any,
) (*ResponseType, *basemodel.ApiError) {
	reqMethod := http.MethodGet
	var reqBody io.Reader

	if payload != nil {
		reqMethod = http.MethodPost

		bodyJson, err := json.Marshal(payload)
		if err != nil {
			return nil, basemodel.InternalError(fmt.Errorf(
				"couldn't serialize payload to JSON: %w", err,
			))
		}
		reqBody = bytes.NewBuffer([]byte(bodyJson))
	}

	baseUrl := strings.TrimSuffix(gatewayUrl, "/")
	reqUrl := fmt.Sprintf("%s%s", baseUrl, path)

	req, err := http.NewRequest(reqMethod, reqUrl, reqBody)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf(
			"couldn't prepare request: %w", err,
		))
	}

	req.Header.Set("X-Signoz-Cloud-Api-Key", licenseKey)
	req.Header.Set("X-Consumer-Username", "lid:00000000-0000-0000-0000-000000000000")
	req.Header.Set("X-Consumer-Groups", "ns:default")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	response, err := client.Do(req)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("couldn't request gateway: %w", err))
	}

	defer response.Body.Close()

	respBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("couldn't read gateway response: %w", err))
	}

	var resp ResponseType

	err = json.Unmarshal(respBody, &resp)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf(
			"couldn't unmarshal gateway response into %T", resp,
		))
	}

	return &resp, nil
}
