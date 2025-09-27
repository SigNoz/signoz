package implauthdomain

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
)

// GetDomainByName returns org domain for a given domain name
func (store *store) GetGettableDomainByName(ctx context.Context, name string) (*types.GettableOrgDomain, error) {

	stored := types.StorableOrgDomain{}
	err := store.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("name = ?", name).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "domain with name: %s doesn't exist", name)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to load domain config")
	}
	return domain, nil
}

// GetDomain returns org domain for a given domain id
func (store *store) GetDomain(ctx context.Context, id uuid.UUID) (*types.GettableOrgDomain, error) {

	stored := types.StorableOrgDomain{}
	err := store.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("id = ?", id).
		Limit(1).
		Scan(ctx)

	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "domain with id: %s doesn't exist", id)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to load domain config")
	}
	return domain, nil
}

// ListDomains gets the list of auth domains by org id
func (store *store) ListDomains(ctx context.Context, orgId valuer.UUID) ([]*types.GettableOrgDomain, error) {
	domains := make([]*types.GettableOrgDomain, 0)
	stored := []types.StorableOrgDomain{}
	err := store.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Where("org_id = ?", orgId).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return domains, nil
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to list domains")
	}

	for _, s := range stored {
		domain := types.GettableOrgDomain{StorableOrgDomain: s}
		if err := domain.LoadConfig(s.Data); err != nil {
			store.settings.Logger.ErrorContext(ctx, "ListDomains() failed", "error", err)
		}
		domains = append(domains, &domain)
	}

	return domains, nil
}

// CreateDomain creates  a new auth domain
func (store *store) CreateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {

	if domain.ID == uuid.Nil {
		domain.ID = uuid.New()
	}

	if domain.OrgID == "" || domain.Name == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "domain creation failed, missing fields: OrgID, Name")
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "domain creation failed")
	}

	storableDomain := types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	_, err = store.sqlstore.BunDB().NewInsert().
		Model(&storableDomain).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "domain creation failed")
	}
	return nil
}

// UpdateDomain updates stored config params for a domain
func (store *store) UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) error {
	if domain.ID == uuid.Nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing domain id")
	}
	configJson, err := json.Marshal(domain)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to update domain")
	}

	storableDomain := &types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{UpdatedAt: time.Now()},
	}

	_, err = store.sqlstore.BunDB().NewUpdate().
		Model(storableDomain).
		Column("data", "updated_at").
		WherePK().
		Exec(ctx)

	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to update domain")
	}

	return nil
}

// DeleteDomain deletes an org domain
func (store *store) DeleteDomain(ctx context.Context, id uuid.UUID) error {

	if id == uuid.Nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing domain id")
	}

	storableDomain := &types.StorableOrgDomain{ID: id}
	_, err := store.sqlstore.BunDB().NewDelete().
		Model(storableDomain).
		WherePK().
		Exec(ctx)

	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete domain")
	}

	return nil
}

func (store *store) GetOrgDomainByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*types.StorableOrgDomain, error) {
	domain := new(types.StorableOrgDomain)

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(domain).
		Where("name = ?", name).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeNotFound, errors.CodeNotFound, "domain with name %s and org %s does not exist", name, orgID)
	}

	return domain, nil
}
