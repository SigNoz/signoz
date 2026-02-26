package serviceaccounttypes

import (
	"encoding/json"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeServiceAccountInvalidInput = errors.MustNewCode("service_account_invalid_input")
)

var (
	StatusActive   = valuer.NewString("active")
	StatusDisabled = valuer.NewString("disabled")
	ValidStatus    = []valuer.String{StatusActive, StatusDisabled}
)

type StorableServiceAccount struct {
	bun.BaseModel `bun:"table:service_account"`

	types.Identifiable
	types.TimeAuditable
	Name   string        `bun:"name"`
	Email  string        `bun:"email"`
	Status valuer.String `bun:"status"`
	OrgID  string        `bun:"org_id"`
}

type ServiceAccount struct {
	types.Identifiable
	types.TimeAuditable
	Name   string        `json:"name" required:"true"`
	Email  valuer.Email  `json:"email" required:"true"`
	Roles  []string      `json:"roles" required:"true"`
	Status valuer.String `json:"status" required:"true"`
	OrgID  valuer.UUID   `json:"orgID" required:"true"`
}

type PostableServiceAccount struct {
	Name  string       `json:"name" required:"true"`
	Email valuer.Email `json:"email" required:"true"`
	Roles []string     `json:"roles" required:"true" nullable:"false"`
}

type UpdatableServiceAccount struct {
	Name   string        `json:"name" required:"true"`
	Email  valuer.Email  `json:"email" required:"true"`
	Roles  []string      `json:"roles" required:"true" nullable:"false"`
	Status valuer.String `json:"status" required:"true"`
}

func NewServiceAccount(name string, email valuer.Email, roles []string, status valuer.String, orgID valuer.UUID) *ServiceAccount {
	return &ServiceAccount{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:   name,
		Email:  email,
		Roles:  roles,
		Status: status,
		OrgID:  orgID,
	}
}

func NewServiceAccountFromStorables(storableServiceAccount *StorableServiceAccount, storableServiceAccountRoles []*StorableServiceAccountRole) *ServiceAccount {
	roles := make([]string, len(storableServiceAccountRoles))
	for idx, storable := range storableServiceAccountRoles {
		roles[idx] = storable.RoleID
	}

	return &ServiceAccount{
		Identifiable:  storableServiceAccount.Identifiable,
		TimeAuditable: storableServiceAccount.TimeAuditable,
		Name:          storableServiceAccount.Name,
		Email:         valuer.MustNewEmail(storableServiceAccount.Email),
		Roles:         roles,
		Status:        storableServiceAccount.Status,
		OrgID:         valuer.MustNewUUID(storableServiceAccount.OrgID),
	}
}

func NewStorableServiceAccount(serviceAccount *ServiceAccount) *StorableServiceAccount {
	return &StorableServiceAccount{
		Identifiable:  serviceAccount.Identifiable,
		TimeAuditable: serviceAccount.TimeAuditable,
		Name:          serviceAccount.Name,
		Email:         serviceAccount.Email.String(),
		Status:        serviceAccount.Status,
		OrgID:         serviceAccount.OrgID.String(),
	}
}

func (sa *ServiceAccount) Update(name string, email valuer.Email, roles []string, status valuer.String) {
	sa.Name = name
	sa.Email = email
	sa.Status = status
	sa.Roles = roles
	sa.UpdatedAt = time.Now()
}

func (sa *PostableServiceAccount) UnmarshalJSON(data []byte) error {
	type Alias PostableServiceAccount

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "name cannot be empty")
	}

	*sa = PostableServiceAccount(temp)
	return nil
}

func (sa *UpdatableServiceAccount) UnmarshalJSON(data []byte) error {
	type Alias UpdatableServiceAccount

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "name cannot be empty")
	}

	if !slices.Contains(ValidStatus, temp.Status) {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "invalid status")
	}

	*sa = UpdatableServiceAccount(temp)
	return nil
}
