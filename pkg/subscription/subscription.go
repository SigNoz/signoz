package subscription

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/subscriptiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeUnsupported = errors.MustNewCode("subscription_unsupported")
)

type Subscription interface {
	Create(ctx context.Context, organizationID valuer.UUID, postableSubscription *subscriptiontypes.PostableSubscription) (*subscriptiontypes.GettableSubscription, error)

	Update(ctx context.Context, organizationID valuer.UUID, postableSubscription *subscriptiontypes.PostableSubscription) (*subscriptiontypes.GettableSubscription, error)

	Get(ctx context.Context, organizationID valuer.UUID) (*subscriptiontypes.GettableSubscriptionUsage, error)
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)
}
