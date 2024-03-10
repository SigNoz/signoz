package integrations

import (
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/constants"
)

// Returns integration_id if `p` is a pipeline for an installed integration.
// Returns null otherwise.
func IntegrationIdForPipeline(p logparsingpipeline.Pipeline) *string {
	if strings.HasPrefix(p.Alias, constants.IntegrationPipelineIdPrefix) {
		parts := strings.Split(p.Alias, IntegrationPipelineIdSeparator)
		if len(parts) < 2 {
			return nil
		}
		integrationId := parts[1]
		return &integrationId
	}
	return nil
}
