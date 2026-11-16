package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

func NewFieldResources(telemetry []coretypes.ResourceWithID) ([]coretypes.ResourceWithID, error) {
	seen := make(map[string]struct{}, 3)
	resources := make([]coretypes.ResourceWithID, 0, 3)
	for _, ref := range telemetry {
		field, err := fieldResource(ref.Resource.Kind())
		if err != nil {
			return nil, err
		}

		kind := field.Kind().String()
		if _, ok := seen[kind]; ok {
			continue
		}
		seen[kind] = struct{}{}
		resources = append(resources, coretypes.ResourceWithID{Resource: field})
	}

	return resources, nil
}

func fieldResource(kind coretypes.Kind) (coretypes.Resource, error) {
	switch kind {
	case coretypes.KindLogs, coretypes.KindAuditLogs:
		return coretypes.ResourceMetaResourceLogsField, nil
	case coretypes.KindTraces:
		return coretypes.ResourceMetaResourceTracesField, nil
	case coretypes.KindMetrics, coretypes.KindMeterMetrics:
		return coretypes.ResourceMetaResourceMetricsField, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "no field resource for telemetry kind %q", kind.String())
	}
}
