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
	"go.signoz.io/signoz/ee/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

type CloudIntegrationConnectionParamsResponse struct {
	IngestionUrl string `json:"ingestion_url,omitempty"`
	IngestionKey string `json:"ingestion_key,omitempty"`
	SigNozAPIUrl string `json:"signoz_api_url,omitempty"`
}

func (ah *APIHandler) CloudIntegrationsGenerateConnectionParams(w http.ResponseWriter, r *http.Request) {
	cloudProvider := mux.Vars(r)["cloudProvider"]
	if cloudProvider != "aws" {
		RespondError(w, basemodel.BadRequest(fmt.Errorf(
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
		ah.Respond(w, CloudIntegrationConnectionParamsResponse{})
		return
	}

	ingestionUrl, signozApiUrl, err := getIngestionUrlAndSigNozAPIUrl(license.Key)
	if err != nil {
		RespondError(w, basemodel.InternalError(fmt.Errorf(
			"couldn't deduce ingestion url and signoz api url: %w", err,
		)), nil)
		return
	}

	result := CloudIntegrationConnectionParamsResponse{
		IngestionUrl: ingestionUrl,
		SigNozAPIUrl: signozApiUrl,
	}

	gatewayUrl := ah.opts.GatewayUrl
	if len(gatewayUrl) > 0 {

		ingestionKey, err := getOrCreateCloudProviderIngestionKey(
			gatewayUrl, license.Key, cloudProvider,
		)
		if err != nil {
			RespondError(w, basemodel.InternalError(fmt.Errorf(
				"couldn't get or create ingestion key: %w", err,
			)), nil)
			return
		}

		result.IngestionKey = ingestionKey
	}

	ah.Respond(w, result)
}

type ingestionKey struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ingestionKeysSearchResponse struct {
	Status string         `json:"status"`
	Data   []ingestionKey `json:"data"`
	Error  string         `json:"error"`
}

type createIngestionKeyResponse struct {
	Status string       `json:"status"`
	Data   ingestionKey `json:"data"`
	Error  string       `json:"error"`
}

func getOrCreateCloudProviderIngestionKey(gatewayUrl string, licenseKey string, cloudProvider string) (string, *basemodel.ApiError) {
	cloudProviderKeyName := fmt.Sprintf("%s-integration", cloudProvider)

	// see if the key already exists
	searchResult, apiErr := requestGateway[ingestionKeysSearchResponse](
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
	zap.L().Info(
		"no existing ingestion key found for cloud integration, creating a new one",
		zap.String("cloudProvider", cloudProvider),
	)
	createKeyResult, apiErr := requestGateway[createIngestionKeyResponse](
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

	baseUrl := strings.TrimSuffix(gatewayUrl, "/")
	reqUrl := fmt.Sprintf("%s%s", baseUrl, path)

	headers := map[string]string{
		"X-Signoz-Cloud-Api-Key": licenseKey,
		"X-Consumer-Username":    "lid:00000000-0000-0000-0000-000000000000",
		"X-Consumer-Groups":      "ns:default",
	}

	return requestAndParseResponse[ResponseType](reqUrl, headers, payload)
}

func getIngestionUrlAndSigNozAPIUrl(licenseKey string) (string, string, *basemodel.ApiError) {
	url := fmt.Sprintf(
		"%s%s",
		strings.TrimSuffix(constants.ZeusURL, "/"),
		"/v2/deployments/me",
	)

	type deploymentResponse struct {
		Status string `json:"status"`
		Error  string `json:"error"`
		Data   struct {
			Name        string `json:"name"`
			ClusterInfo struct {
				Region struct {
					DNS string `json:"dns"`
				} `json:"region"`
			} `json:"cluster"`
		} `json:"data"`
	}

	resp, apiErr := requestAndParseResponse[deploymentResponse](
		url, map[string]string{"X-Signoz-Cloud-Api-Key": licenseKey}, nil,
	)

	if apiErr != nil {
		return "", "", basemodel.WrapApiError(
			apiErr, "couldn't query for deployment info",
		)
	}

	if resp.Status != "success" {
		return "", "", basemodel.InternalError(fmt.Errorf(
			"couldn't query for deployment info: status: %s, error: %s",
			resp.Status, resp.Error,
		))
	}

	regionDns := resp.Data.ClusterInfo.Region.DNS
	ingestionUrl := fmt.Sprintf("https://ingest.%s", regionDns)

	deploymentName := resp.Data.Name
	signozApiUrl := fmt.Sprintf("https://%s.%s", deploymentName, regionDns)

	return ingestionUrl, signozApiUrl, nil
}

func requestAndParseResponse[ResponseType any](
	url string, headers map[string]string, payload any,
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

	req, err := http.NewRequest(reqMethod, url, reqBody)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf(
			"couldn't prepare request: %w", err,
		))
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

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
