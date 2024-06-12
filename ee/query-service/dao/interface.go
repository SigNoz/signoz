package dao

import (
	"context"
	"net/url"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	basedao "go.signoz.io/signoz/pkg/query-service/dao"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type ModelDao interface {
	basedao.ModelDao

	// SetFlagProvider sets the feature lookup provider
	SetFlagProvider(flags baseint.FeatureLookup)

	DB() *sqlx.DB

	// auth methods
	CanUsePassword(ctx context.Context, email string) (bool, *basemodel.ApiError)
	PrepareSsoRedirect(ctx context.Context, redirectUri, email string) (redirectURL string, apierr *basemodel.ApiError)
	GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*model.OrgDomain, error)

	// org domain (auth domains) CRUD ops
	ListDomains(ctx context.Context, orgId string) ([]model.OrgDomain, *basemodel.ApiError)
	GetDomain(ctx context.Context, id uuid.UUID) (*model.OrgDomain, *basemodel.ApiError)
	CreateDomain(ctx context.Context, d *model.OrgDomain) *basemodel.ApiError
	UpdateDomain(ctx context.Context, domain *model.OrgDomain) *basemodel.ApiError
	DeleteDomain(ctx context.Context, id uuid.UUID) *basemodel.ApiError
	GetDomainByEmail(ctx context.Context, email string) (*model.OrgDomain, *basemodel.ApiError)

	CreatePAT(ctx context.Context, p model.PAT) (model.PAT, *basemodel.ApiError)
	UpdatePAT(ctx context.Context, p model.PAT, id string) *basemodel.ApiError
	GetPAT(ctx context.Context, pat string) (*model.PAT, *basemodel.ApiError)
	UpdatePATLastUsed(ctx context.Context, pat string, lastUsed int64) *basemodel.ApiError
	GetPATByID(ctx context.Context, id string) (*model.PAT, *basemodel.ApiError)
	GetUserByPAT(ctx context.Context, token string) (*basemodel.UserPayload, *basemodel.ApiError)
	ListPATs(ctx context.Context) ([]model.PAT, *basemodel.ApiError)
	RevokePAT(ctx context.Context, id string, userID string) *basemodel.ApiError
}
