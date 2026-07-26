package dashboardtypes

import "github.com/SigNoz/signoz/pkg/errors"

// V2DashboardAPIDocsLink documents the v2 dashboard API — its endpoints and request bodies.
const V2DashboardAPIDocsLink = "https://signoz.io/docs/dashboards/dashboards-v2-api/"

// NewV1DeprecatedError builds the error a deprecated v1 dashboard endpoint returns.
// useInstead names the v2 endpoint to call; the docs link is appended for the details.
func NewV1DeprecatedError(useInstead string) error {
	return errors.Newf(errors.TypeUnsupported, ErrCodeDashboardV1Deprecated,
		"the v1 dashboard API is deprecated; instead, %s. See %s", useInstead, V2DashboardAPIDocsLink)
}
