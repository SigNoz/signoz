package integrations

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
)

const IntegrationPipelineIdSeparator string = "--"

func AliasForIntegrationPipeline(
	integrationId string, pipelineName string,
) string {
	return strings.Join(
		[]string{constants.IntegrationPipelineIdPrefix, integrationId, pipelineName},
		IntegrationPipelineIdSeparator,
	)
}

// Returns ptr to integration_id string if `p` is a pipeline for an installed integration.
// Returns null otherwise.
func IntegrationIdForPipeline(p pipelinetypes.GettablePipeline) *string {
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
