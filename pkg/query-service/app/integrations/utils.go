package integrations

import (
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
)

// Returns integration_id if `p` is a pipeline for an installed integration.
// Returns null otherwise.
func IntegrationIdForPipeline(p logparsingpipeline.Pipeline) *string {
	if strings.HasPrefix(p.Id, INTEGRATION_PIPELINE_ID_PREFIX) {
		parts := strings.Split(p.Id, "::")
		if len(parts) < 2 {
			return nil
		}
		integrationId := parts[1]
		return &integrationId
	}
	return nil
}
