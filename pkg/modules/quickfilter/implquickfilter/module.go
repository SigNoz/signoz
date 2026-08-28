package implquickfilter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store quickfiltertypes.QuickFilterStore
}

func NewModule(store quickfiltertypes.QuickFilterStore) quickfilter.Module {
	return &module{store: store}
}

// GetQuickFilters returns quick filters for a signal, or for every signal when signal is zero.
func (module *module) GetQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal) ([]*quickfiltertypes.SignalFilters, error) {
	if signal.IsZero() {
		storedFilters, err := module.store.Get(ctx, orgID)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error fetching organization filters")
		}

		result := make([]*quickfiltertypes.SignalFilters, 0, len(storedFilters))
		for _, storedFilter := range storedFilters {
			signalFilter, err := quickfiltertypes.NewSignalFilterFromStorableQuickFilter(storedFilter)
			if err != nil {
				return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for signal: %s", storedFilter.Signal)
			}
			result = append(result, signalFilter)
		}

		return result, nil
	}

	storedFilter, err := module.store.GetBySignal(ctx, orgID, signal.StringValue())
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return []*quickfiltertypes.SignalFilters{quickfiltertypes.NewSignalFiltersFromSignal(signal)}, nil
		}
		return nil, err
	}

	signalFilter, err := quickfiltertypes.NewSignalFilterFromStorableQuickFilter(storedFilter)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for signal: %s", storedFilter.Signal)
	}

	return []*quickfiltertypes.SignalFilters{signalFilter}, nil
}

// UpsertQuickFilters replaces quick filters for a specific signal in an organization, creating them if absent.
func (module *module) UpsertQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal, filters []telemetrytypes.TelemetryFieldKey) error {
	filter, err := quickfiltertypes.NewStorableQuickFilter(orgID, signal, filters)
	if err != nil {
		return err
	}

	return module.store.Upsert(ctx, filter)
}

func (module *module) SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error {
	storableQuickFilters, err := quickfiltertypes.NewDefaultQuickFilter(orgID)
	if err != nil {
		return err
	}

	return module.store.Create(ctx, storableQuickFilters)
}
