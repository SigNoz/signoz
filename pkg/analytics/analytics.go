package analytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

type Analytics interface {
	factory.Service

	// Sends analytics messages to an analytics backend.
	Send(context.Context, ...analyticstypes.Message)
}
