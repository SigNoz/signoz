package httpzeus

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/tidwall/gjson"
)

type Provider struct {
	settings   factory.ScopedProviderSettings
	config     zeus.Config
	httpClient *client.Client
}

func NewProviderFactory() factory.ProviderFactory[zeus.Zeus, zeus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/zeus/httpzeus")

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
	}, nil
}

func (provider *Provider) GetLicense(ctx context.Context, key string) ([]byte, error) {
	response, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/licenses/me"),
		http.MethodGet,
		key,
		nil,
	)
	if err != nil {
		return nil, err
	}

	return []byte(gjson.GetBytes(response, "data").String()), nil
}

func (provider *Provider) GetCheckoutURL(ctx context.Context, key string, body []byte) ([]byte, error) {
	response, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/subscriptions/me/sessions/checkout"),
		http.MethodPost,
		key,
		body,
	)
	if err != nil {
		return nil, err
	}

	return []byte(gjson.GetBytes(response, "data").String()), nil
}

func (provider *Provider) GetPortalURL(ctx context.Context, key string, body []byte) ([]byte, error) {
	response, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/subscriptions/me/sessions/portal"),
		http.MethodPost,
		key,
		body,
	)
	if err != nil {
		return nil, err
	}

	return []byte(gjson.GetBytes(response, "data").String()), nil
}

func (provider *Provider) GetDeployment(ctx context.Context, key string) ([]byte, error) {
	response, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/deployments/me"),
		http.MethodGet,
		key,
		nil,
	)
	if err != nil {
		return nil, err
	}

	return []byte(gjson.GetBytes(response, "data").String()), nil
}

func (provider *Provider) PutMeters(ctx context.Context, key string, data []byte) error {
	_, err := provider.do(
		ctx,
		provider.config.DeprecatedURL.JoinPath("/api/v1/usage"),
		http.MethodPost,
		key,
		data,
	)

	return err
}

func (provider *Provider) PutProfile(ctx context.Context, key string, body []byte) error {
	_, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/profiles/me"),
		http.MethodPut,
		key,
		body,
	)

	return err
}

func (provider *Provider) PutHost(ctx context.Context, key string, body []byte) error {
	_, err := provider.do(
		ctx,
		provider.config.URL.JoinPath("/v2/deployments/me/hosts"),
		http.MethodPut,
		key,
		body,
	)

	return err
}

func (provider *Provider) do(ctx context.Context, url *url.URL, method string, key string, requestBody []byte) ([]byte, error) {
	request, err := http.NewRequestWithContext(ctx, method, url.String(), bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, err
	}
	request.Header.Set("X-Signoz-Cloud-Api-Key", key)
	request.Header.Set("Content-Type", "application/json")

	response, err := provider.httpClient.Do(request)
	if err != nil {
		return nil, err
	}

	defer func() {
		_ = response.Body.Close()
	}()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	if response.StatusCode/100 == 2 {
		return body, nil
	}

	return nil, provider.errFromStatusCode(response.StatusCode)
}

// This can be taken down to the client package
func (provider *Provider) errFromStatusCode(statusCode int) error {
	switch statusCode {
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
