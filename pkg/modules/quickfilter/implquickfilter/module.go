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

func (module *module) Get(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source) (*quickfiltertypes.StorableQuickFilter, error) {
	return module.store.GetBySource(ctx, orgID, source.StringValue())
}

// GetQuickFilters returns quick filters for a source, or for every source when source is zero.
func (module *module) GetQuickFilters(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source) ([]*quickfiltertypes.SourceFilters, error) {
	if source.IsZero() {
		storedFilters, err := module.store.Get(ctx, orgID)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error fetching organization filters")
		}

		result := make([]*quickfiltertypes.SourceFilters, 0, len(storedFilters))
		for _, storedFilter := range storedFilters {
			sourceFilter, err := quickfiltertypes.NewSourceFilterFromStorableQuickFilter(storedFilter)
			if err != nil {
				return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for source: %s", storedFilter.Source)
			}
			result = append(result, sourceFilter)
		}

		return result, nil
	}

	storedFilter, err := module.store.GetBySource(ctx, orgID, source.StringValue())
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return []*quickfiltertypes.SourceFilters{}, nil
		}
		return nil, err
	}

	sourceFilter, err := quickfiltertypes.NewSourceFilterFromStorableQuickFilter(storedFilter)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for source: %s", storedFilter.Source)
	}

	return []*quickfiltertypes.SourceFilters{sourceFilter}, nil
}

// UpsertQuickFilters replaces quick filters for a specific source in an organization, creating them if absent.
func (module *module) UpsertQuickFilters(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source, filters []telemetrytypes.TelemetryFieldKey) error {
	filter, err := quickfiltertypes.NewStorableQuickFilter(orgID, source, filters)
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
