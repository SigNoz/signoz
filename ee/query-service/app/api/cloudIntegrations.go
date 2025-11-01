package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

type CloudIntegrationConnectionParamsResponse struct {
	IngestionUrl string `json:"ingestion_url,omitempty"`
	IngestionKey string `json:"ingestion_key,omitempty"`
	SigNozAPIUrl string `json:"signoz_api_url,omitempty"`
	SigNozAPIKey string `json:"signoz_api_key,omitempty"`
}

func (ah *APIHandler) CloudIntegrationsGenerateConnectionParams(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is invalid"))
		return
	}

	cloudProvider := mux.Vars(r)["cloudProvider"]
	if cloudProvider != "aws" {
		RespondError(w, basemodel.BadRequest(fmt.Errorf(
			"cloud provider not supported: %s", cloudProvider,
		)), nil)
		return
	}

	apiKey, apiErr := ah.getOrCreateCloudIntegrationPAT(r.Context(), claims.OrgID, cloudProvider)
	if apiErr != nil {
		RespondError(w, basemodel.WrapApiError(
			apiErr, "couldn't provision PAT for cloud integration:",
		), nil)
		return
	}

	result := CloudIntegrationConnectionParamsResponse{
		SigNozAPIKey: apiKey,
	}

	license, err := ah.Signoz.Licensing.GetActive(r.Context(), orgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	if license == nil {
		// Return the API Key (PAT) even if the rest of the params can not be deduced.
		// Params not returned from here will be requested from the user via form inputs.
		// This enables gracefully degraded but working experience even for non-cloud deployments.
		zap.L().Info("ingestion params and signoz api url can not be deduced since no license was found")
		ah.Respond(w, result)
		return
	}

	ingestionUrl, signozApiUrl, apiErr := ah.getIngestionUrlAndSigNozAPIUrl(r.Context(), license.Key)
	if apiErr != nil {
		RespondError(w, basemodel.WrapApiError(
			apiErr, "couldn't deduce ingestion url and signoz api url",
		), nil)
		return
	}

	result.IngestionUrl = ingestionUrl
	result.SigNozAPIUrl = signozApiUrl

	gatewayUrl := ah.opts.GatewayUrl
	if len(gatewayUrl) > 0 {

		ingestionKey, apiErr := getOrCreateCloudProviderIngestionKey(
			r.Context(), gatewayUrl, license.Key, cloudProvider,
		)
		if apiErr != nil {
			RespondError(w, basemodel.WrapApiError(
				apiErr, "couldn't get or create ingestion key",
			), nil)
			return
		}

		result.IngestionKey = ingestionKey

	} else {
		zap.L().Info("ingestion key can't be deduced since no gateway url has been configured")
	}

	ah.Respond(w, result)
}

func (ah *APIHandler) getOrCreateCloudIntegrationPAT(ctx context.Context, orgId string, cloudProvider string) (
	string, *basemodel.ApiError,
) {
	integrationPATName := fmt.Sprintf("%s integration", cloudProvider)

	integrationUser, apiErr := ah.getOrCreateCloudIntegrationUser(ctx, orgId, cloudProvider)
	if apiErr != nil {
		return "", apiErr
	}

	orgIdUUID, err := valuer.NewUUID(orgId)
	if err != nil {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't parse orgId: %w", err,
		))
	}

	allPats, err := ah.Signoz.Modules.User.ListAPIKeys(ctx, orgIdUUID)
	if err != nil {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't list PATs: %w", err,
		))
	}
	for _, p := range allPats {
		if p.UserID == integrationUser.ID && p.Name == integrationPATName {
			return p.Token, nil
		}
	}

	zap.L().Info(
		"no PAT found for cloud integration, creating a new one",
		zap.String("cloudProvider", cloudProvider),
	)

	newPAT, err := types.NewStorableAPIKey(
		integrationPATName,
		integrationUser.ID,
		types.RoleViewer,
		0,
	)
	if err != nil {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't create cloud integration PAT: %w", err,
		))
	}

	err = ah.Signoz.Modules.User.CreateAPIKey(ctx, newPAT)
	if err != nil {
		return "", basemodel.InternalError(fmt.Errorf(
			"couldn't create cloud integration PAT: %w", err,
		))
	}
	return newPAT.Token, nil
}

func (ah *APIHandler) getOrCreateCloudIntegrationUser(
	ctx context.Context, orgId string, cloudProvider string,
) (*types.User, *basemodel.ApiError) {
	cloudIntegrationUserName := fmt.Sprintf("%s-integration", cloudProvider)
	email := valuer.MustNewEmail(fmt.Sprintf("%s@signoz.io", cloudIntegrationUserName))

	cloudIntegrationUser, err := types.NewUser(cloudIntegrationUserName, email, types.RoleViewer, valuer.MustNewUUID(orgId))
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("couldn't create cloud integration user: %w", err))
	}

	password := types.MustGenerateFactorPassword(cloudIntegrationUser.ID.StringValue())

	cloudIntegrationUser, err = ah.Signoz.Modules.User.GetOrCreateUser(ctx, cloudIntegrationUser, user.WithFactorPassword(password))
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("couldn't look for integration user: %w", err))
	}

	return cloudIntegrationUser, nil
}

func (ah *APIHandler) getIngestionUrlAndSigNozAPIUrl(ctx context.Context, licenseKey string) (
	string, string, *basemodel.ApiError,
) {
	// TODO: remove this struct from here
	type deploymentResponse struct {
		Name        string `json:"name"`
		ClusterInfo struct {
			Region struct {
				DNS string `json:"dns"`
			} `json:"region"`
		} `json:"cluster"`
	}

	respBytes, err := ah.Signoz.Zeus.GetDeployment(ctx, licenseKey)
	if err != nil {
		return "", "", basemodel.InternalError(fmt.Errorf(
			"couldn't query for deployment info: error: %w", err,
		))
	}

	resp := new(deploymentResponse)

	err = json.Unmarshal(respBytes, resp)
	if err != nil {
		return "", "", basemodel.InternalError(fmt.Errorf(
			"couldn't unmarshal deployment info response: error: %w", err,
		))
	}

	regionDns := resp.ClusterInfo.Region.DNS
	deploymentName := resp.Name

	if len(regionDns) < 1 || len(deploymentName) < 1 {
		// Fail early if actual response structure and expectation here ever diverge
		return "", "", basemodel.InternalError(fmt.Errorf(
			"deployment info response not in expected shape. couldn't determine region dns and deployment name",
		))
	}

	ingestionUrl := fmt.Sprintf("https://ingest.%s", regionDns)

	signozApiUrl := fmt.Sprintf("https://%s.%s", deploymentName, regionDns)

	return ingestionUrl, signozApiUrl, nil
}

type ingestionKey struct {
	Name  string `json:"name"`
	Value string `json:"value"`
	// other attributes from gateway response not included here since they are not being used.
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

func getOrCreateCloudProviderIngestionKey(
	ctx context.Context, gatewayUrl string, licenseKey string, cloudProvider string,
) (string, *basemodel.ApiError) {
	cloudProviderKeyName := fmt.Sprintf("%s-integration", cloudProvider)

	// see if the key already exists
	searchResult, apiErr := requestGateway[ingestionKeysSearchResponse](
		ctx,
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
			if len(k.Value) < 1 {
				// Fail early if actual response structure and expectation here ever diverge
				return "", basemodel.InternalError(fmt.Errorf(
					"ingestion keys search response not as expected",
				))
			}

			return k.Value, nil
		}
	}

	zap.L().Info(
		"no existing ingestion key found for cloud integration, creating a new one",
		zap.String("cloudProvider", cloudProvider),
	)
	createKeyResult, apiErr := requestGateway[createIngestionKeyResponse](
		ctx, gatewayUrl, licenseKey, "/v1/workspaces/me/keys",
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

	ingestionKey := createKeyResult.Data.Value
	if len(ingestionKey) < 1 {
		// Fail early if actual response structure and expectation here ever diverge
		return "", basemodel.InternalError(fmt.Errorf(
			"ingestion key creation response not as expected",
		))
	}

	return ingestionKey, nil
}

func requestGateway[ResponseType any](
	ctx context.Context, gatewayUrl string, licenseKey string, path string, payload any,
) (*ResponseType, *basemodel.ApiError) {

	baseUrl := strings.TrimSuffix(gatewayUrl, "/")
	reqUrl := fmt.Sprintf("%s%s", baseUrl, path)

	headers := map[string]string{
		"X-Signoz-Cloud-Api-Key": licenseKey,
		"X-Consumer-Username":    "lid:00000000-0000-0000-0000-000000000000",
		"X-Consumer-Groups":      "ns:default",
	}

	return requestAndParseResponse[ResponseType](ctx, reqUrl, headers, payload)
}

func requestAndParseResponse[ResponseType any](
	ctx context.Context, url string, headers map[string]string, payload any,
) (*ResponseType, *basemodel.ApiError) {

	reqMethod := http.MethodGet
	var reqBody io.Reader
	if payload != nil {
		reqMethod = http.MethodPost

		bodyJson, err := json.Marshal(payload)
		if err != nil {
			return nil, basemodel.InternalError(fmt.Errorf(
				"couldn't serialize request payload to JSON: %w", err,
			))
		}
		reqBody = bytes.NewBuffer([]byte(bodyJson))
	}

	req, err := http.NewRequestWithContext(ctx, reqMethod, url, reqBody)
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
		return nil, basemodel.InternalError(fmt.Errorf("couldn't make request: %w", err))
	}

	defer response.Body.Close()

	respBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("couldn't read response: %w", err))
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
