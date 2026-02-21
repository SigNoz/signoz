package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

// TODO: move this file with other cloud integration related code

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

	cloudProviderString := mux.Vars(r)["cloudProvider"]

	cloudProvider, err := integrationstypes.NewCloudProvider(cloudProviderString)
	if err != nil {
		render.Error(w, err)
		return
	}

	apiKey, err := ah.getOrCreateCloudIntegrationPAT(r.Context(), claims.OrgID, cloudProvider)
	if err != nil {
		render.Error(w, err)
		return
	}

	result := integrationstypes.GettableCloudIntegrationConnectionParams{
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
		ah.opts.Logger.InfoContext(
			r.Context(),
			"ingestion params and signoz api url can not be deduced since no license was found",
		)
		render.Success(w, http.StatusOK, result)
		return
	}

	signozApiUrl, err := ah.getIngestionUrlAndSigNozAPIUrl(r.Context(), license.Key)
	if err != nil {
		render.Error(w, err)
		return
	}

	result.IngestionUrl = ah.opts.GlobalConfig.IngestionURL.String()
	result.SigNozAPIUrl = signozApiUrl

	gatewayUrl := ah.opts.GatewayUrl
	if len(gatewayUrl) > 0 {
		ingestionKeyString, err := ah.getOrCreateCloudProviderIngestionKey(
			r.Context(), gatewayUrl, license.Key, cloudProvider,
		)
		if err != nil {
			render.Error(w, err)
			return
		}

		result.IngestionKey = ingestionKeyString
	} else {
		ah.opts.Logger.InfoContext(
			r.Context(),
			"ingestion key can't be deduced since no gateway url has been configured",
		)
	}

	render.Success(w, http.StatusOK, result)
}

func (ah *APIHandler) getOrCreateCloudIntegrationPAT(ctx context.Context, orgId string, cloudProvider valuer.String) (string, error) {
	integrationPATName := fmt.Sprintf("%s integration", cloudProvider)

	integrationUser, err := ah.getOrCreateCloudIntegrationUser(ctx, orgId, cloudProvider)
	if err != nil {
		return "", err
	}

	orgIdUUID, err := valuer.NewUUID(orgId)
	if err != nil {
		return "", err
	}

	allPats, err := ah.Signoz.Modules.User.ListAPIKeys(ctx, orgIdUUID)
	if err != nil {
		return "", err
	}
	for _, p := range allPats {
		if p.UserID == integrationUser.ID && p.Name == integrationPATName {
			return p.Token, nil
		}
	}

	ah.opts.Logger.InfoContext(
		ctx,
		"no PAT found for cloud integration, creating a new one",
		slog.String("cloudProvider", cloudProvider.String()),
	)

	newPAT, err := types.NewStorableAPIKey(
		integrationPATName,
		integrationUser.ID,
		types.RoleViewer,
		0,
	)
	if err != nil {
		return "", err
	}

	err = ah.Signoz.Modules.User.CreateAPIKey(ctx, newPAT)
	if err != nil {
		return "", err
	}
	return newPAT.Token, nil
}

// TODO: move this function out of handler and use proper module structure
func (ah *APIHandler) getOrCreateCloudIntegrationUser(ctx context.Context, orgId string, cloudProvider valuer.String) (*types.User, error) {
	cloudIntegrationUserName := fmt.Sprintf("%s-integration", cloudProvider.String())
	email := valuer.MustNewEmail(fmt.Sprintf("%s@signoz.io", cloudIntegrationUserName))

	cloudIntegrationUser, err := types.NewUser(cloudIntegrationUserName, email, types.RoleViewer, valuer.MustNewUUID(orgId))
	if err != nil {
		return nil, err
	}

	password := types.MustGenerateFactorPassword(cloudIntegrationUser.ID.StringValue())

	cloudIntegrationUser, err = ah.Signoz.Modules.User.GetOrCreateUser(ctx, cloudIntegrationUser, user.WithFactorPassword(password))
	if err != nil {
		return nil, err
	}

	return cloudIntegrationUser, nil
}

// TODO: move this function out of handler and use proper module structure
func (ah *APIHandler) getIngestionUrlAndSigNozAPIUrl(ctx context.Context, licenseKey string) (string, error) {
	respBytes, err := ah.Signoz.Zeus.GetDeployment(ctx, licenseKey)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "couldn't query for deployment info: error")
	}

	resp := new(integrationstypes.GettableDeployment)

	err = json.Unmarshal(respBytes, resp)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "couldn't unmarshal deployment info response")
	}

	regionDns := resp.ClusterInfo.Region.DNS
	deploymentName := resp.Name

	if len(regionDns) < 1 || len(deploymentName) < 1 {
		// Fail early if actual response structure and expectation here ever diverge
		return "", errors.WrapInternalf(
			err,
			errors.CodeInternal,
			"deployment info response not in expected shape. couldn't determine region dns and deployment name",
		)
	}

	signozApiUrl := fmt.Sprintf("https://%s.%s", deploymentName, regionDns)

	return signozApiUrl, nil
}

func (ah *APIHandler) getOrCreateCloudProviderIngestionKey(
	ctx context.Context, gatewayUrl string, licenseKey string, cloudProvider valuer.String,
) (string, error) {
	cloudProviderKeyName := fmt.Sprintf("%s-integration", cloudProvider)

	// see if the key already exists
	searchResult, err := requestGateway[integrationstypes.GettableIngestionKeysSearch](
		ctx,
		gatewayUrl,
		licenseKey,
		fmt.Sprintf("/v1/workspaces/me/keys/search?name=%s", cloudProviderKeyName),
		nil,
		ah.opts.Logger,
	)
	if err != nil {
		return "", err
	}

	if searchResult.Status != "success" {
		return "", errors.NewInternalf(
			errors.CodeInternal,
			"couldn't search for cloud provider ingestion key: status: %s, error: %s",
			searchResult.Status, searchResult.Error,
		)
	}

	for _, k := range searchResult.Data {
		if k.Name != cloudProviderKeyName {
			continue
		}

		if len(k.Value) < 1 {
			// Fail early if actual response structure and expectation here ever diverge
			return "", errors.NewInternalf(errors.CodeInternal, "ingestion keys search response not as expected")
		}

		return k.Value, nil
	}

	ah.opts.Logger.InfoContext(
		ctx,
		"no existing ingestion key found for cloud integration, creating a new one",
		slog.String("cloudProvider", cloudProvider.String()),
	)

	createKeyResult, err := requestGateway[integrationstypes.GettableCreateIngestionKey](
		ctx, gatewayUrl, licenseKey, "/v1/workspaces/me/keys",
		map[string]any{
			"name": cloudProviderKeyName,
			"tags": []string{"integration", cloudProvider.String()},
		},
		ah.opts.Logger,
	)
	if err != nil {
		return "", err
	}

	if createKeyResult.Status != "success" {
		return "", errors.NewInternalf(
			errors.CodeInternal,
			"couldn't create cloud provider ingestion key: status: %s, error: %s",
			createKeyResult.Status, createKeyResult.Error,
		)
	}

	ingestionKeyString := createKeyResult.Data.Value
	if len(ingestionKeyString) < 1 {
		// Fail early if actual response structure and expectation here ever diverge
		return "", errors.NewInternalf(errors.CodeInternal,
			"ingestion key creation response not as expected",
		)
	}

	return ingestionKeyString, nil
}

func requestGateway[ResponseType any](
	ctx context.Context, gatewayUrl, licenseKey, path string, payload any, logger *slog.Logger,
) (*ResponseType, error) {

	baseUrl := strings.TrimSuffix(gatewayUrl, "/")
	reqUrl := fmt.Sprintf("%s%s", baseUrl, path)

	headers := map[string]string{
		"X-Signoz-Cloud-Api-Key": licenseKey,
		"X-Consumer-Username":    "lid:00000000-0000-0000-0000-000000000000",
		"X-Consumer-Groups":      "ns:default",
	}

	return requestAndParseResponse[ResponseType](ctx, reqUrl, headers, payload, logger)
}

func requestAndParseResponse[ResponseType any](
	ctx context.Context, url string, headers map[string]string, payload any, logger *slog.Logger,
) (*ResponseType, error) {
	reqMethod := http.MethodGet
	var reqBody io.Reader
	if payload != nil {
		reqMethod = http.MethodPost

		bodyJson, err := json.Marshal(payload)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't marshal payload")
		}
		reqBody = bytes.NewBuffer(bodyJson)
	}

	req, err := http.NewRequestWithContext(ctx, reqMethod, url, reqBody)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't create req")
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	response, err := client.Do(req)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't make req")
	}

	defer func() {
		err = response.Body.Close()
		if err != nil {
			logger.ErrorContext(ctx, "couldn't close response body", "error", err)
		}
	}()

	respBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read response body")
	}

	var resp ResponseType

	err = json.Unmarshal(respBody, &resp)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't unmarshal response body")
	}

	return &resp, nil
}
