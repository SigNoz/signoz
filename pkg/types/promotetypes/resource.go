package promotetypes

import (
	"github.com/tidwall/gjson"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// PromotePathsResources resolves the field resources of the signals in a promote request body.
func PromotePathsResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	values := gjson.GetBytes(ec.RequestBody, "#.signal").Array()
	signals := make([]telemetrytypes.Signal, 0, len(values))
	for _, value := range values {
		signal, ok := telemetrytypes.SignalFromText(value.String())
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal: %s", value.String())
		}
		signals = append(signals, signal)
	}

	return fieldResources(signals)
}

// ListPromotedPathsResources resolves the field resources of the filtered signals, or of all when none match.
func ListPromotedPathsResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	filters := ListPromotedPathsFilters{}
	if ec.Request != nil {
		filters.Signal = ec.Request.URL.Query().Get("signal")
		filters.Context = ec.Request.URL.Query().Get("context")
	}

	signals := make([]telemetrytypes.Signal, 0)
	for _, target := range Targets() {
		if filters.MatchesTarget(target) {
			signals = append(signals, target.Entry.Signal)
		}
	}
	if len(signals) == 0 {
		for _, target := range Targets() {
			signals = append(signals, target.Entry.Signal)
		}
	}

	return fieldResources(signals)
}

func IndexMaterializedPathsResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	signalText := ""
	if ec.Request != nil {
		signalText = ec.Request.URL.Query().Get("signal")
	}
	signal, ok := telemetrytypes.SignalFromText(signalText)
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal: %s", signalText)
	}
	return fieldResources([]telemetrytypes.Signal{signal})
}

func fieldResources(signals []telemetrytypes.Signal) ([]coretypes.ResourceWithID, error) {
	resources := make([]coretypes.ResourceWithID, 0, len(signals))
	seen := make(map[string]struct{})
	for _, signal := range signals {
		resource, ok := fieldResource(signal)
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "promotion is not supported for signal %s", signal.StringValue())
		}
		if _, ok := seen[resource.Kind().String()]; ok {
			continue
		}
		seen[resource.Kind().String()] = struct{}{}
		resources = append(resources, coretypes.ResourceWithID{Resource: resource})
	}

	return resources, nil
}

func fieldResource(signal telemetrytypes.Signal) (coretypes.Resource, bool) {
	switch signal {
	case telemetrytypes.SignalLogs:
		return coretypes.ResourceMetaResourceLogsField, true
	case telemetrytypes.SignalTraces:
		return coretypes.ResourceMetaResourceTracesField, true
	default:
		return nil, false
	}
}
