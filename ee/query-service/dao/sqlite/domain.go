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
	"go.uber.org/zap"
)

// StoredDomain represents stored database record for org domain

type StoredDomain struct {
	Id        uuid.UUID `db:"id"`
	Name      string    `db:"name"`
	OrgId     string    `db:"org_id"`
	Data      string    `db:"data"`
	CreatedAt int64     `db:"created_at"`
	UpdatedAt int64     `db:"updated_at"`
}

// GetDomainFromSsoResponse uses relay state received from IdP to fetch
// user domain. The domain is further used to process validity of the response.
// when sending login request to IdP we send relay state as URL (site url)
// with domainId or domainName as query parameter.
func (m *modelDao) GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*model.OrgDomain, error) {
	// derive domain id from relay state now
	var domainIdStr string
	var domainNameStr string
	var domain *model.OrgDomain

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
func (m *modelDao) GetDomainByName(ctx context.Context, name string) (*model.OrgDomain, basemodel.BaseApiError) {

	stored := StoredDomain{}
	err := m.DB().Get(&stored, `SELECT * FROM org_domains WHERE name=$1 LIMIT 1`, name)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain name"))
		}
		return nil, model.InternalError(err)
	}

	domain := &model.OrgDomain{Id: stored.Id, Name: stored.Name, OrgId: stored.OrgId}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// GetDomain returns org domain for a given domain id
func (m *modelDao) GetDomain(ctx context.Context, id uuid.UUID) (*model.OrgDomain, basemodel.BaseApiError) {

	stored := StoredDomain{}
	err := m.DB().Get(&stored, `SELECT * FROM org_domains WHERE id=$1 LIMIT 1`, id)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.BadRequest(fmt.Errorf("invalid domain id"))
		}
		return nil, model.InternalError(err)
	}

	domain := &model.OrgDomain{Id: stored.Id, Name: stored.Name, OrgId: stored.OrgId}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}

// ListDomains gets the list of auth domains by org id
func (m *modelDao) ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, basemodel.BaseApiError) {
	domains := []model.OrgDomain{}

	stored := []StoredDomain{}
	err := m.DB().SelectContext(ctx, &stored, `SELECT * FROM org_domains WHERE org_id=$1`, orgId)

	if err != nil {
		if err == sql.ErrNoRows {
			return []model.OrgDomain{}, nil
		}
		return nil, model.InternalError(err)
	}

	for _, s := range stored {
		domain := model.OrgDomain{Id: s.Id, Name: s.Name, OrgId: s.OrgId}
		if err := domain.LoadConfig(s.Data); err != nil {
			zap.L().Error("ListDomains() failed", zap.Error(err))
		}
		domains = append(domains, domain)
	}

	return domains, nil
}

// CreateDomain creates  a new auth domain
func (m *modelDao) CreateDomain(ctx context.Context, domain *model.OrgDomain) basemodel.BaseApiError {

	if domain.Id == uuid.Nil {
		domain.Id = uuid.New()
	}

	if domain.OrgId == "" || domain.Name == "" {
		return model.BadRequest(fmt.Errorf("domain creation failed, missing fields: OrgId, Name "))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("failed to unmarshal domain config", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	_, err = m.DB().ExecContext(ctx,
		"INSERT INTO org_domains (id, name, org_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		domain.Id,
		domain.Name,
		domain.OrgId,
		configJson,
		time.Now().Unix(),
		time.Now().Unix())

	if err != nil {
		zap.L().Error("failed to insert domain in db", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain creation failed"))
	}

	return nil
}

// UpdateDomain updates stored config params for a domain
func (m *modelDao) UpdateDomain(ctx context.Context, domain *model.OrgDomain) basemodel.BaseApiError {

	if domain.Id == uuid.Nil {
		zap.L().Error("domain update failed", zap.Error(fmt.Errorf("OrgDomain.Id is null")))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	configJson, err := json.Marshal(domain)
	if err != nil {
		zap.L().Error("domain update failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain update failed"))
	}

	_, err = m.DB().ExecContext(ctx,
		"UPDATE org_domains SET data = $1, updated_at = $2 WHERE id = $3",
		configJson,
		time.Now().Unix(),
		domain.Id)

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

	_, err := m.DB().ExecContext(ctx,
		"DELETE FROM org_domains WHERE id = $1",
		id)

	if err != nil {
		zap.L().Error("domain delete failed", zap.Error(err))
		return model.InternalError(fmt.Errorf("domain delete failed"))
	}

	return nil
}

func (m *modelDao) GetDomainByEmail(ctx context.Context, email string) (*model.OrgDomain, basemodel.BaseApiError) {

	if email == "" {
		return nil, model.BadRequest(fmt.Errorf("could not find auth domain, missing fields: email "))
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, model.BadRequest(fmt.Errorf("invalid email address"))
	}

	parsedDomain := components[1]

	stored := StoredDomain{}
	err := m.DB().Get(&stored, `SELECT * FROM org_domains WHERE name=$1 LIMIT 1`, parsedDomain)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, model.InternalError(err)
	}

	domain := &model.OrgDomain{Id: stored.Id, Name: stored.Name, OrgId: stored.OrgId}
	if err := domain.LoadConfig(stored.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return domain, nil
}
