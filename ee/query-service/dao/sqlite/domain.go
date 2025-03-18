package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
	"go.uber.org/zap"
)

// GetDomainFromSsoResponse uses relay state received from IdP to fetch
// user domain. The domain is further used to process validity of the response.
// when sending login request to IdP we send relay state as URL (site url)
// with domainId or domainName as query parameter.
func (m *modelDao) GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*types.GettableOrgDomain, error) {
	// derive domain id from relay state now
	var domainIdStr string
	var domainNameStr string
	var domain *types.GettableOrgDomain

	for k, v := range relayState.Query() {
		if k == "domainId" && len(v) > 0 {
			domainIdStr = strings.Replace(v[0], ":", "-", -1)
		}
		if k == "domainName" && len(v) > 0 {
			domainNameStr = v[0]
		}
	}

	if domainIdStr != "" {
		domainId, err := uuid.Parse(domainIdStr)
		if err != nil {
			zap.L().Error("failed to parse domainId from relay state", zap.Error(err))
			return nil, fmt.Errorf("failed to parse domainId from IdP response")
		}

		domain, err = m.GetDomain(ctx, domainId)
		if (err != nil) || domain == nil {
			zap.L().Error("failed to find domain from domainId received in IdP response", zap.Error(err))
			return nil, fmt.Errorf("invalid credentials")
		}
	}

	if domainNameStr != "" {

		domainFromDB, err := m.GetDomainByName(ctx, domainNameStr)
		domain = domainFromDB
		if (err != nil) || domain == nil {
			zap.L().Error("failed to find domain from domainName received in IdP response", zap.Error(err))
			return nil, fmt.Errorf("invalid credentials")
		}
	}
	if domain != nil {
		return domain, nil
	}

	return nil, fmt.Errorf("failed to find domain received in IdP response")
}

// GetDomainByName returns org domain for a given domain name
func (m *modelDao) GetDomainByName(ctx context.Context, name string) (*types.GettableOrgDomain, basemodel.BaseApiError) {

	stored := types.StorableOrgDomain{}
	err := m.DB().NewSelect().
		Model(&stored).
		Where("name = ?", name).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain name"))
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// GetDomain returns org domain for a given domain id
func (m *modelDao) GetDomain(ctx context.Context, id uuid.UUID) (*types.GettableOrgDomain, basemodel.BaseApiError) {

	stored := types.StorableOrgDomain{}
	err := m.DB().NewSelect().
		Model(&stored).
		Where("id = ?", id).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain id"))
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// ListDomains gets the list of auth domains by org id
func (m *modelDao) ListDomains(ctx context.Context, orgId string) ([]types.GettableOrgDomain, basemodel.BaseApiError) {
	domains := []types.GettableOrgDomain{}

	stored := []types.StorableOrgDomain{}
	err := m.DB().NewSelect().
		Model(&stored).
		Where("org_id = ?", orgId).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return domains, nil
		}
		return nil, model.InternalError(err)
	}

	for _, s := range stored {
		domain := types.GettableOrgDomain{StorableOrgDomain: s}
		if err := domain.LoadConfig(s.Data); err != nil {
			zap.L().Error("ListDomains() failed", zap.Error(err))
		}
		domains = append(domains, domain)
	}

	return domains, nil
}

// CreateDomain creates  a new auth domain
func (m *modelDao) CreateDomain(ctx context.Context, domain *types.GettableOrgDomain) basemodel.BaseApiError {

	if domain.ID == uuid.Nil {
		domain.ID = uuid.New()
	}

	if domain.OrgID == "" || domain.Name == "" {
		return model.BadRequest(fmt.Errorf("domain creation failed, missing fields: OrgID, Name "))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("failed to unmarshal domain config", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	storableDomain := types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	_, err = m.DB().NewInsert().
		Model(&storableDomain).
		Exec(ctx)

	if err != nil {
		zap.L().Error("failed to insert domain in db", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	return nil
}

// UpdateDomain updates stored config params for a domain
func (m *modelDao) UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) basemodel.BaseApiError {

	if domain.ID == uuid.Nil {
		zap.L().Error("domain update failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	storableDomain := &types.StorableOrgDomain{
		ID:            domain.ID,
		Name:          domain.Name,
		OrgID:         domain.OrgID,
		Data:          string(configJson),
		TimeAuditable: types.TimeAuditable{UpdatedAt: time.Now()},
	}

	_, err = m.DB().NewUpdate().
		Model(storableDomain).
		Column("data", "updated_at").
		WherePK().
		Exec(ctx)

	if err != nil {
		zap.L().Error("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	return nil
}

// DeleteDomain deletes an org domain
func (m *modelDao) DeleteDomain(ctx context.Context, id uuid.UUID) basemodel.BaseApiError {

	if id == uuid.Nil {
		zap.L().Error("domain delete failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain delete failed"))
	}

	storableDomain := &types.StorableOrgDomain{ID: id}
	_, err := m.DB().NewDelete().
		Model(storableDomain).
		WherePK().
		Exec(ctx)

	if err != nil {
		zap.L().Error("domain delete failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain delete failed"))
	}

	return nil
}

func (m *modelDao) GetDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, basemodel.BaseApiError) {

	if email == "" {
		return nil, model.BadRequest(fmt.Errorf("could not find auth domain, missing fields: email "))
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, model.BadRequest(fmt.Errorf("invalid email address"))
	}

	parsedDomain := components[1]

	stored := types.StorableOrgDomain{}
	err := m.DB().NewSelect().
		Model(&stored).
		Where("name = ?", parsedDomain).
		Limit(1).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, model.InternalError(err)
	}

	domain := &types.GettableOrgDomain{StorableOrgDomain: stored}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}
