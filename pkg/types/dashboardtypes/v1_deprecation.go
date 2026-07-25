package dashboardtypes

import "github.com/SigNoz/signoz/pkg/errors"

// The v1 dashboard API is superseded by the v2 dashboard API; every v1 endpoint
// now returns a deprecation error pointing at its v2 replacement. The body-carrying
// endpoints (create, update) point to the v2 request-schema docs below; the
// body-less endpoints just name the v2 endpoint to call.
const (
	V2CreateDashboardSchemaLink = "https://signoz.io/dashboards/schema/dashboard_create.json"
	V2UpdateDashboardSchemaLink = "https://signoz.io/dashboards/schema/dashboard_update.json"
	V2PatchDashboardSchemaLink  = "https://signoz.io/dashboards/schema/dashboard_patch.json"
)

// NewV1DeprecatedError builds the error a deprecated v1 dashboard endpoint returns.
// useInstead names the v2 replacement — a schema link for the create/update
// endpoints, or the v2 endpoint to call for the body-less ones.
func NewV1DeprecatedError(useInstead string) error {
	return errors.Newf(errors.TypeUnsupported, ErrCodeDashboardV1Deprecated,
		"the v1 dashboard API is deprecated; instead, %s", useInstead)
}
