package httpgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
)

type Provider struct {
	settings   factory.ScopedProviderSettings
	config     gateway.Config
	httpClient *client.Client
	licensing  licensing.Licensing
}

func NewProviderFactory(licensing licensing.Licensing) factory.ProviderFactory[gateway.Gateway, gateway.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, ps factory.ProviderSettings, c gateway.Config) (gateway.Gateway, error) {
		return New(ctx, ps, c, licensing)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config gateway.Config, licensing licensing.Licensing) (gateway.Gateway, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/gateway/httpgateway")

	httpClient, err := client.New(
		settings.Logger(),
		providerSettings.TracerProvider,
		providerSettings.MeterProvider,
		client.WithRequestResponseLog(true),
		client.WithRetryCount(3),
	)
	if err != nil {
		return nil, err
	}

	return &Provider{
		settings:   settings,
		config:     config,
		httpClient: httpClient,
		licensing:  licensing,
	}, nil
}

func (provider *Provider) GetIngestionKeys(ctx context.Context, orgID valuer.UUID, page, perPage int) (*gatewaytypes.IngestionKeysResponse, error) {
	qParams := url.Values{}
	qParams.Add("page", strconv.Itoa(page))
	qParams.Add("per_page", strconv.Itoa(perPage))

	responseBody, err := provider.do(ctx, orgID, http.MethodGet, "/v1/workspaces/me/keys", qParams, nil)
	if err != nil {
		return nil, err
	}

	var ingestionKeys []gatewaytypes.IngestionKey
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "data").String()), &ingestionKeys); err != nil {
		return nil, err
	}

	var pagination gatewaytypes.Pagination
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "_pagination").String()), &pagination); err != nil {
		return nil, err
	}

	return &gatewaytypes.IngestionKeysResponse{
		Keys:       ingestionKeys,
		Pagination: pagination,
	}, nil
}

func (provider *Provider) SearchIngestionKeysByName(ctx context.Context, orgID valuer.UUID, name string, page, perPage int) (*gatewaytypes.IngestionKeysResponse, error) {
	qParams := url.Values{}
	qParams.Add("name", name)
	qParams.Add("page", strconv.Itoa(page))
	qParams.Add("per_page", strconv.Itoa(perPage))

	responseBody, err := provider.do(ctx, orgID, http.MethodGet, "/v1/workspaces/me/keys/search", qParams, nil)
	if err != nil {
		return nil, err
	}

	var ingestionKeys []gatewaytypes.IngestionKey
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "data").String()), &ingestionKeys); err != nil {
		return nil, err
	}

	var pagination gatewaytypes.Pagination
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "_pagination").String()), &pagination); err != nil {
		return nil, err
	}

	return &gatewaytypes.IngestionKeysResponse{
		Keys:       ingestionKeys,
		Pagination: pagination,
	}, nil
}

func (provider *Provider) CreateIngestionKey(ctx context.Context, orgID valuer.UUID, name string, tags []string, expiresAt time.Time) (*gatewaytypes.CreatedIngestionKeyResponse, error) {
	requestBody := gatewaytypes.IngestionKeyRequest{
		Name:      name,
		Tags:      tags,
		ExpiresAt: expiresAt,
	}
	requestBodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	responseBody, err := provider.do(ctx, orgID, http.MethodPost, "/v1/workspaces/me/keys", nil, requestBodyBytes)
	if err != nil {
		return nil, err
	}

	var createdKeyResponse gatewaytypes.CreatedIngestionKeyResponse
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "data").String()), &createdKeyResponse); err != nil {
		return nil, err
	}

	return &createdKeyResponse, nil
}

func (provider *Provider) UpdateIngestionKey(ctx context.Context, orgID valuer.UUID, keyID string, name string, tags []string, expiresAt time.Time) error {
	requestBody := gatewaytypes.IngestionKeyRequest{
		Name:      name,
		Tags:      tags,
		ExpiresAt: expiresAt,
	}
	requestBodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	_, err = provider.do(ctx, orgID, http.MethodPatch, "/v1/workspaces/me/keys/"+keyID, nil, requestBodyBytes)
	if err != nil {
		return err
	}

	return nil
}

func (provider *Provider) DeleteIngestionKey(ctx context.Context, orgID valuer.UUID, keyID string) error {
	_, err := provider.do(ctx, orgID, http.MethodDelete, "/v1/workspaces/me/keys/"+keyID, nil, nil)
	if err != nil {
		return err
	}

	return nil
}

func (provider *Provider) CreateIngestionKeyLimit(ctx context.Context, orgID valuer.UUID, keyID string, signal string, limitConfig gatewaytypes.LimitConfig) (*gatewaytypes.CreatedIngestionKeyLimitResponse, error) {
	requestBody := gatewaytypes.IngestionKeyLimitRequest{
		Signal: signal,
		Config: limitConfig,
		KeyID:  keyID,
	}
	requestBodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	responseBody, err := provider.do(ctx, orgID, http.MethodPost, "/v1/workspaces/me/keys/"+keyID+"/limits", nil, requestBodyBytes)
	if err != nil {
		return nil, err
	}

	var createdIngestionKeyLimitResponse gatewaytypes.CreatedIngestionKeyLimitResponse
	if err := json.Unmarshal([]byte(gjson.GetBytes(responseBody, "data").String()), &createdIngestionKeyLimitResponse); err != nil {
		return nil, err
	}

	return &createdIngestionKeyLimitResponse, nil
}

func (provider *Provider) UpdateIngestionKeyLimit(ctx context.Context, orgID valuer.UUID, limitID string, signal string, limitConfig gatewaytypes.LimitConfig) error {
	requestBody := gatewaytypes.IngestionKeyLimitRequest{
		Signal: signal,
		Config: limitConfig,
	}
	requestBodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}

	_, err = provider.do(ctx, orgID, http.MethodPatch, "/v1/workspaces/me/keys/limits/"+limitID, nil, requestBodyBytes)
	if err != nil {
		return err
	}

	return nil
}

func (provider *Provider) DeleteIngestionKeyLimit(ctx context.Context, orgID valuer.UUID, limitID string) error {
	_, err := provider.do(ctx, orgID, http.MethodDelete, "/v1/workspaces/me/keys/limits/"+limitID, nil, nil)
	if err != nil {
		return err
	}

	return nil
}

func (provider *Provider) do(ctx context.Context, orgID valuer.UUID, method string, path string, queryParams url.Values, body []byte) ([]byte, error) {
	license, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "no valid license found").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	var licenseKey string
	if license != nil {
		licenseKey = license.Key
	}

	// build url
	reqestURL := provider.config.URL.JoinPath(path)

	// add query params to the url
	if queryParams != nil {
		reqestURL.RawQuery = queryParams.Encode()
	}

	// build request
	request, err := http.NewRequestWithContext(ctx, method, reqestURL.String(), bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	// add headers needed to call gateway
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Signoz-Cloud-Api-Key", licenseKey)
	request.Header.Set("X-Consumer-Username", "lid:00000000-0000-0000-0000-000000000000")
	request.Header.Set("X-Consumer-Groups", "ns:default")

	// execute request
	response, err := provider.httpClient.Do(request)
	if err != nil {
		return nil, err
	}

	// read response
	defer response.Body.Close()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	// only 2XX
	if response.StatusCode/100 == 2 {
		return responseBody, nil
	}

	// return error for non 2XX
	return nil, provider.errFromStatusCode(response.StatusCode)
}

func (provider *Provider) errFromStatusCode(code int) error {
	switch code {

	case http.StatusBadRequest:
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "bad request")

	case http.StatusUnauthorized:
		return errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated")

	case http.StatusForbidden:
		return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "forbidden")

	case http.StatusNotFound:
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "not found")
	}

	return errors.Newf(errors.TypeInternal, errors.CodeInternal, "internal")
}
