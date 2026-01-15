package httpgateway

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func (provider *Provider) GetIngestionKeysByWorkspaceID(ctx context.Context, orgID valuer.UUID, workspaceID valuer.UUID, page, perPage int) ([]byte, error) {
	qParams := url.Values{}
	qParams.Add("page", strconv.Itoa(page))
	qParams.Add("per_page", strconv.Itoa(perPage))

	// ! TODO: make this strongly typed
	return provider.do(ctx, orgID, http.MethodGet, "/api/v2/gateway/ingestion-keys", qParams, nil)
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

	// done, return yay
	return responseBody, nil
}
