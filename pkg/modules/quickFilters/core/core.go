package core

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/quickFilters"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"time"
)

type usecase struct {
	store quickfiltertypes.QuickFilterStore
}

// NewQuickFilters creates a new quick filters usecase
func NewQuickFilters(store quickfiltertypes.QuickFilterStore) quickFilters.Usecase {
	return &usecase{store: store}
}

// GetOrgQuickFilters returns all quick filters for an organization
func (u *usecase) GetOrgQuickFilters(ctx context.Context, orgID string) ([]*quickfiltertypes.SignalFilters, error) {
	storedFilters, err := u.store.GetOrgFilters(ctx, orgID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error fetching organization filters")
	}

	result := make([]*quickfiltertypes.SignalFilters, 0, len(storedFilters))
	for _, storedFilter := range storedFilters {
		var filters []v3.AttributeKey
		err := json.Unmarshal([]byte(storedFilter.Filter), &filters)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error unmarshalling filters")
		}

		result = append(result, &quickfiltertypes.SignalFilters{
			Signal:  storedFilter.Signal,
			Filters: filters,
		})
	}

	return result, nil
}

// GetSignalFilters returns quick filters for a specific signal in an organization
func (u *usecase) GetSignalFilters(ctx context.Context, orgID string, signal string) (*quickfiltertypes.SignalFilters, error) {
	if !quickfiltertypes.IsValidSignal(signal) {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", signal)
	}

	storedFilter, err := u.store.GetSignalFilters(ctx, orgID, signal)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error fetching signal filters")
	}

	var filters []v3.AttributeKey
	if storedFilter != nil {
		err := json.Unmarshal([]byte(storedFilter.Filter), &filters)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error unmarshalling filters")
		}
	}

	return &quickfiltertypes.SignalFilters{
		Signal:  signal,
		Filters: filters,
	}, nil
}

// UpdateOrgQuickFilters updates quick filters for a specific signal in an organization
func (u *usecase) UpdateOrgQuickFilters(ctx context.Context, orgID string, signal string, filters []v3.AttributeKey) error {
	if !quickfiltertypes.IsValidSignal(signal) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", signal)
	}

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
	existingFilter, err := u.store.GetSignalFilters(ctx, orgID, signal)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error checking existing filters")
	}

	now := time.Now()
	var filter *quickfiltertypes.StorableOrgFilter

	if existingFilter != nil {
		// Update existing filter
		filter = existingFilter
		filter.Filter = string(filterJSON)
		filter.UpdatedAt = now
	} else {
		// Create new filter
		filter = &quickfiltertypes.StorableOrgFilter{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:     orgID,
			Signal:    signal,
			Filter:    string(filterJSON),
			CreatedAt: now,
			UpdatedAt: now,
		}
	}

	err = u.store.UpsertOrgFilter(ctx, filter)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("error updating filters for signal: %s", signal))
	}

	return nil
}
