package promotetypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// PromotePathsResources resolves the field resources of the signals in a promote request body.
func PromotePathsResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	var paths []PromotePath
	if err := json.Unmarshal(ec.RequestBody, &paths); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promote paths request body")
	}

	signals := make([]telemetrytypes.Signal, 0, len(paths))
	for _, path := range paths {
		signal, ok := telemetrytypes.SignalFromText(path.Signal)
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal: %s", path.Signal)
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
	if err := filters.Validate(); err != nil {
		return nil, err
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

func fieldResources(signals []telemetrytypes.Signal) ([]coretypes.ResourceWithID, error) {
	resources := make([]coretypes.ResourceWithID, 0, len(signals))
	seen := make(map[string]struct{})
	for _, signal := range signals {
		resource, ok := signal.FieldResource()
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
