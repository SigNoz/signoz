package httpsubscription

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/subscription"
	"github.com/SigNoz/signoz/pkg/types/subscriptiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/tidwall/gjson"
)

const upstreamTimeout = 10 * time.Second

type provider struct {
	zeus      zeus.Zeus
	licensing licensing.Licensing
}

func New(zeus zeus.Zeus, licensing licensing.Licensing) subscription.Subscription {
	return &provider{
		zeus:      zeus,
		licensing: licensing,
	}
}

func (provider *provider) Create(ctx context.Context, organizationID valuer.UUID, postableSubscription *subscriptiontypes.PostableSubscription) (*subscriptiontypes.GettableSubscription, error) {
	ctx, cancel := context.WithTimeout(ctx, upstreamTimeout)
	defer cancel()

	license, err := provider.licensing.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(postableSubscription)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal subscription payload")
	}

	response, err := provider.zeus.GetCheckoutURL(ctx, license.Key, body)
	if err != nil {
		if errors.Ast(err, errors.TypeAlreadyExists) {
			return nil, errors.WithAdditionalf(err, "checkout has already been completed for this account. Please click 'Refresh Status' to sync your subscription")
		}
		return nil, err
	}

	return &subscriptiontypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()}, nil
}

func (provider *provider) Update(ctx context.Context, organizationID valuer.UUID, postableSubscription *subscriptiontypes.PostableSubscription) (*subscriptiontypes.GettableSubscription, error) {
	ctx, cancel := context.WithTimeout(ctx, upstreamTimeout)
	defer cancel()

	license, err := provider.licensing.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(postableSubscription)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal subscription payload")
	}

	response, err := provider.zeus.GetPortalURL(ctx, license.Key, body)
	if err != nil {
		return nil, err
	}

	return &subscriptiontypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()}, nil
}

func (provider *provider) Get(ctx context.Context, organizationID valuer.UUID) (*subscriptiontypes.GettableSubscriptionUsage, error) {
	license, err := provider.licensing.GetActive(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	data, err := provider.zeus.GetMeters(ctx, license.Key)
	if err != nil {
		return nil, err
	}

	usage, err := subscriptiontypes.NewGettableSubscriptionUsage(data)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, zeus.ErrCodeResponseMalformed, "failed to unmarshal subscription usage")
	}

	return usage, nil
}
