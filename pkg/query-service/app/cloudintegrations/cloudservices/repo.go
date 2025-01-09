package cloudservicesintegration

import "context"

type AvailableServicesRepo interface {
	list(context.Context) []CloudServiceDetails

	get(ctx context.Context, id string) CloudServiceDetails
}
