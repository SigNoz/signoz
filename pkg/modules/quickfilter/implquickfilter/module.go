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

// GetQuickFilters returns all quick filters for an organization.
func (module *module) GetQuickFilters(ctx context.Context, orgID valuer.UUID) ([]*quickfiltertypes.SignalFilters, error) {
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

// GetSignalFilters returns quick filters for a specific signal in an organization.
func (m *module) GetSignalFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal) (*quickfiltertypes.SignalFilters, error) {
	storedFilter, err := m.store.GetBySignal(ctx, orgID, signal.StringValue())
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return &quickfiltertypes.SignalFilters{
				Signal:  signal,
				Filters: []telemetrytypes.TelemetryFieldKey{},
			}, nil
		}
		return nil, err
	}

	signalFilter, err := quickfiltertypes.NewSignalFilterFromStorableQuickFilter(storedFilter)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for signal: %s", storedFilter.Signal)
	}

	return signalFilter, nil
}

// UpdateQuickFilters updates quick filters for a specific signal in an organization.
func (module *module) UpdateQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal, filters []telemetrytypes.TelemetryFieldKey) error {
	existingFilter, err := module.store.GetBySignal(ctx, orgID, signal.StringValue())
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error checking existing filters")
	}

	var filter *quickfiltertypes.StorableQuickFilter
	if existingFilter != nil {
		if err := existingFilter.Update(filters); err != nil {
			return err
		}
		filter = existingFilter
	} else {
		filter, err = quickfiltertypes.NewStorableQuickFilter(orgID, signal, filters)
		if err != nil {
			return err
		}
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
