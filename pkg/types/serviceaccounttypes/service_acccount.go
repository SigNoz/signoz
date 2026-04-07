package serviceaccounttypes

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeServiceAccountInvalidConfig        = errors.MustNewCode("service_account_invalid_config")
	ErrCodeServiceAccountInvalidInput         = errors.MustNewCode("service_account_invalid_input")
	ErrCodeServiceAccountAlreadyExists        = errors.MustNewCode("service_account_already_exists")
	ErrCodeServiceAccountNotFound             = errors.MustNewCode("service_account_not_found")
	ErrCodeServiceAccountRoleAlreadyExists    = errors.MustNewCode("service_account_role_already_exists")
	ErrCodeServiceAccountOperationUnsupported = errors.MustNewCode("service_account_operation_unsupported")
	errInvalidServiceAccountName              = errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "name must be 1–50 characters long and contain only lowercase letters (a-z) and hyphens (-)")
)

var (
	ServiceAccountStatusActive  = ServiceAccountStatus{valuer.NewString("active")}
	ServiceAccountStatusDeleted = ServiceAccountStatus{valuer.NewString("deleted")}
)

var (
	serviceAccountNameRegex = regexp.MustCompile("^[a-z-]{1,50}$")
)

type ServiceAccountStatus struct{ valuer.String }

type ServiceAccount struct {
	bun.BaseModel `bun:"table:service_account,alias:service_account"`

	types.Identifiable
	types.TimeAuditable
	Name   string               `bun:"name" json:"name" required:"true"`
	Email  valuer.Email         `bun:"email" json:"email" required:"true"`
	Status ServiceAccountStatus `bun:"status" json:"status" required:"true"`
	OrgID  valuer.UUID          `bun:"org_id" json:"orgId" required:"true"`
}

type ServiceAccountRole struct {
	bun.BaseModel `bun:"table:service_account_role,alias:service_account_role"`

	types.Identifiable
	types.TimeAuditable
	ServiceAccountID valuer.UUID `bun:"service_account_id" json:"serviceAccountId" required:"true"`
	RoleID           valuer.UUID `bun:"role_id" json:"roleId" required:"true"`

	Role *authtypes.Role `bun:"rel:belongs-to,join:role_id=id" json:"role" required:"true"`
}

type ServiceAccountWithRoles struct {
	*ServiceAccount `bun:",extend"`

	ServiceAccountRoles []*ServiceAccountRole `bun:"rel:has-many,join:id=service_account_id" json:"serviceAccountRoles" required:"true" nullable:"true"`
}

type PostableServiceAccount struct {
	Name string `json:"name" required:"true"`
}

type PostableServiceAccountRole struct {
	ID valuer.UUID `json:"id" required:"true"`
}

type UpdatableServiceAccount = PostableServiceAccount

func NewServiceAccount(name string, emailDomain string, status ServiceAccountStatus, orgID valuer.UUID) *ServiceAccount {
	return &ServiceAccount{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:   name,
		Email:  valuer.MustNewEmail(fmt.Sprintf("%s@%s", name, emailDomain)),
		Status: status,
		OrgID:  orgID,
	}
}

func NewServiceAccountWithRoles(sa *ServiceAccount, saRoles []*ServiceAccountRole) *ServiceAccountWithRoles {
	return &ServiceAccountWithRoles{
		ServiceAccount:      sa,
		ServiceAccountRoles: saRoles,
	}
}

func (serviceAccount *ServiceAccount) Update(name string) error {
	if err := serviceAccount.ErrIfDeleted(); err != nil {
		return err
	}

	serviceAccount.Name = name
	serviceAccount.UpdatedAt = time.Now()
	return nil
}

func (serviceAccount *ServiceAccount) UpdateStatus(status ServiceAccountStatus) error {
	if err := serviceAccount.ErrIfDeleted(); err != nil {
		return err
	}

	serviceAccount.Status = status
	serviceAccount.UpdatedAt = time.Now()
	return nil
}

func (serviceAccount *ServiceAccount) ErrIfDeleted() error {
	if serviceAccount.Status == ServiceAccountStatusDeleted {
		return errors.New(errors.TypeUnsupported, ErrCodeServiceAccountOperationUnsupported, "this operation is not supported for disabled service account")
	}

	return nil
}

func (serviceAccount *ServiceAccount) AddRole(role *authtypes.Role) (*ServiceAccountRole, error) {
	if err := serviceAccount.ErrIfDeleted(); err != nil {
		return nil, err
	}

	return &ServiceAccountRole{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		ServiceAccountID: serviceAccount.ID,
		RoleID:           role.ID,
		Role:             role,
	}, nil
}

func (serviceAccount *ServiceAccount) NewFactorAPIKey(name string, expiresAt uint64) (*FactorAPIKey, error) {
	if err := serviceAccount.ErrIfDeleted(); err != nil {
		return nil, err
	}

	if expiresAt != 0 && time.Now().After(time.Unix(int64(expiresAt), 0)) {
		return nil, errors.New(errors.TypeInvalidInput, ErrCodeAPIKeyInvalidInput, "cannot set api key expiry in the past")
	}

	key := make([]byte, 32)
	_, err := rand.Read(key)
	if err != nil {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to generate token")
	}
	// Encode the token in base64.
	encodedKey := base64.StdEncoding.EncodeToString(key)

	return &FactorAPIKey{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:             name,
		Key:              encodedKey,
		ExpiresAt:        expiresAt,
		LastObservedAt:   time.Now(),
		ServiceAccountID: serviceAccount.ID,
	}, nil
}

func (serviceAccount *ServiceAccount) ToIdentity() *authtypes.Identity {
	return &authtypes.Identity{
		ServiceAccountID: serviceAccount.ID,
		Principal:        authtypes.PrincipalServiceAccount,
		OrgID:            serviceAccount.OrgID,
		IdenNProvider:    authtypes.IdentNProviderAPIKey,
		Email:            serviceAccount.Email,
	}
}

func (serviceAccount *ServiceAccount) Traits() map[string]any {
	return map[string]any{
		"name":       serviceAccount.Name,
		"email":      serviceAccount.Email.String(),
		"created_at": serviceAccount.CreatedAt,
		"status":     serviceAccount.Status.StringValue(),
	}
}

func (serviceAccount *ServiceAccountWithRoles) RoleNames() []string {
	names := []string{}
	for _, role := range serviceAccount.ServiceAccountRoles {
		names = append(names, role.Role.Name)
	}

	return names
}

func (serviceAccount *PostableServiceAccount) UnmarshalJSON(data []byte) error {
	type Alias PostableServiceAccount

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if match := serviceAccountNameRegex.MatchString(temp.Name); !match {
		return errInvalidServiceAccountName
	}

	*serviceAccount = PostableServiceAccount(temp)
	return nil
}

func (serviceAccount *ServiceAccountWithRoles) GetRoles() []*authtypes.Role {
	roles := make([]*authtypes.Role, len(serviceAccount.ServiceAccountRoles))
	for idx, serviceAccountRole := range serviceAccount.ServiceAccountRoles {
		roles[idx] = serviceAccountRole.Role
	}

	return roles
}

type Store interface {
	// Service Account
	Create(context.Context, *ServiceAccount) error
	GetWithRoles(context.Context, valuer.UUID, valuer.UUID) (*ServiceAccountWithRoles, error)
	Get(context.Context, valuer.UUID, valuer.UUID) (*ServiceAccount, error)
	GetActiveByOrgIDAndName(context.Context, valuer.UUID, string) (*ServiceAccount, error)
	GetByID(context.Context, valuer.UUID) (*ServiceAccount, error)
	CountByOrgID(context.Context, valuer.UUID) (int64, error)
	List(context.Context, valuer.UUID) ([]*ServiceAccount, error)
	Update(context.Context, valuer.UUID, *ServiceAccount) error

	// Service Account Role
	CreateServiceAccountRole(context.Context, *ServiceAccountRole) error
	DeleteServiceAccountRoles(context.Context, valuer.UUID) error
	DeleteServiceAccountRole(context.Context, valuer.UUID, valuer.UUID) error

	// Service Account Factor API Key
	CreateFactorAPIKey(context.Context, *FactorAPIKey) error
	GetFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) (*FactorAPIKey, error)
	GetFactorAPIKeyByName(context.Context, valuer.UUID, string) (*FactorAPIKey, error)
	GetFactorAPIKeyByKey(context.Context, string) (*FactorAPIKey, error)
	CountFactorAPIKeysByOrgID(context.Context, valuer.UUID) (int64, error)
	ListFactorAPIKey(context.Context, valuer.UUID) ([]*FactorAPIKey, error)
	UpdateFactorAPIKey(context.Context, valuer.UUID, *FactorAPIKey) error
	UpdateLastObservedAt(context.Context, string, time.Time) error
	RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error
	RevokeAllFactorAPIKeys(context.Context, valuer.UUID) error

	RunInTx(context.Context, func(context.Context) error) error
}
