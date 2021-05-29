package app

import (
	"context"

	"go.signoz.io/query-service/model"
)

type Reader interface {
	GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error)
	GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, error)
	// GetApplicationPercentiles(ctx context.Context, query *model.ApplicationPercentileParams) ([]godruid.Timeseries, error)
	SearchSpans(ctx context.Context, query *model.SpanSearchParams) (*[]model.SearchSpansResult, error)
}
