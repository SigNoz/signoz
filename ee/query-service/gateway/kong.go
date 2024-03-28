package gateway

import (
	"context"
	"errors"
	"net/http"

	"github.com/kong/go-kong/kong"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type kongGateway struct {
	client *kong.Client
}

func NewKongGateway(url string) (Gateway, error) {
	client, err := kong.NewClient(kong.String(url), nil)
	if err != nil {
		return nil, err
	}

	return &kongGateway{
		client: client,
	}, nil
}

func (gateway *kongGateway) CreateTenant(ctx context.Context, name string) basemodel.BaseApiError {
	_, err := gateway.client.Consumers.Create(ctx,
		&kong.Consumer{
			Username: kong.String(name),
		})

	if err != nil {
		var apiErr kong.APIError
		if errors.As(err, &apiErr) {
			if apiErr.Code() == http.StatusConflict {
				return nil
			}
		}
		return basemodel.InternalError(err)
	}

	return nil
}

func (gateway *kongGateway) CreateKey(ctx context.Context, name string, ttl int64) (string, string, basemodel.BaseApiError) {
	keyAuth, err := gateway.client.KeyAuths.Create(ctx,
		kong.String(name),
		&kong.KeyAuth{
			TTL: kong.Int(int(ttl)),
		},
	)
	if err != nil {
		return "", "", basemodel.InternalError(err)
	}

	return *keyAuth.ID, *keyAuth.Key, nil
}

func (gateway *kongGateway) DeleteKey(ctx context.Context, name string, id string) basemodel.BaseApiError {
	err := gateway.client.KeyAuths.Delete(ctx,
		kong.String(name),
		kong.String(id),
	)
	if err != nil {
		return basemodel.InternalError(err)
	}

	return nil
}
