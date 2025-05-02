package core

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type usecase struct {
	store quickfiltertypes.QuickFilterStore
}

// NewQuickFilters creates a new quick filters usecase
func NewQuickFilters(store quickfiltertypes.QuickFilterStore) quickfilter.Usecase {
	return &usecase{store: store}
}

// GetQuickFilters returns all quick filters for an organization
func (u *usecase) GetQuickFilters(ctx context.Context, orgID valuer.UUID) ([]*quickfiltertypes.SignalFilters, error) {
	storedFilters, err := u.store.Get(ctx, orgID)
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

// GetSignalFilters returns quick filters for a specific signal in an organization
func (u *usecase) GetSignalFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal) (*quickfiltertypes.SignalFilters, error) {
	storedFilter, err := u.store.GetBySignal(ctx, orgID, signal.StringValue())
	if err != nil {
		return nil, err
	}

	// If no filter exists for this signal, return empty filters with the requested signal
	if storedFilter == nil {
		return &quickfiltertypes.SignalFilters{
			Signal:  signal,
			Filters: []v3.AttributeKey{},
		}, nil
	}

	// Convert stored filter to signal filter
	signalFilter, err := quickfiltertypes.NewSignalFilterFromStorableQuickFilter(storedFilter)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error processing filter for signal: %s", storedFilter.Signal)
	}

	return signalFilter, nil
}

// UpdateQuickFilters updates quick filters for a specific signal in an organization
func (u *usecase) UpdateQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal, filters []v3.AttributeKey) error {
	// Validate each filter
	for _, filter := range filters {
		if err := filter.Validate(); err != nil {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid filter: %v", err)
		}
	}

	// Marshal filters to JSON
	filterJSON, err := json.Marshal(filters)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error marshalling filters")
	}

	// Check if filter exists
	existingFilter, err := u.store.GetBySignal(ctx, orgID, signal.StringValue())
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error checking existing filters")
	}

	var filter *quickfiltertypes.StorableQuickFilter
	if existingFilter != nil {
		// Update in place
		if err := existingFilter.Update(filterJSON); err != nil {
			return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "error updating existing filter")
		}
		filter = existingFilter
	} else {
		// Create new
		filter, err = quickfiltertypes.NewStorableQuickFilter(orgID, signal, filterJSON)
		if err != nil {
			return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "error creating new filter")
		}
	}

	// Persist filter
	if err := u.store.Upsert(ctx, filter); err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("error upserting filter for signal: %s", signal.StringValue()))
	}

	return nil
}

func (u *usecase) SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error {
	storableQuickFilters, err := quickfiltertypes.NewDefaultQuickFilter(orgID)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error creating default quick filters")
	}
	return u.store.Create(ctx, storableQuickFilters)
}
