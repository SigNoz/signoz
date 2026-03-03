package serviceaccounttypes

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeServiceAccountInvalidInput      = errors.MustNewCode("service_account_invalid_input")
	ErrCodeServiceAccountAlreadyExists     = errors.MustNewCode("service_account_already_exists")
	ErrCodeServiceAccountNotFound          = errors.MustNewCode("service_account_not_found")
	ErrCodeServiceAccountRoleAlreadyExists = errors.MustNewCode("service_account_role_already_exists")
)

var (
	StatusActive   = valuer.NewString("active")
	StatusDisabled = valuer.NewString("disabled")
	ValidStatus    = []valuer.String{StatusActive, StatusDisabled}
)

type StorableServiceAccount struct {
	bun.BaseModel `bun:"table:service_account,alias:service_account"`

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
	Roles  []string      `json:"roles" required:"true" nullable:"false"`
	Status valuer.String `json:"status" required:"true"`
	OrgID  valuer.UUID   `json:"orgID" required:"true"`
}

type PostableServiceAccount struct {
	Name  string       `json:"name" required:"true"`
	Email valuer.Email `json:"email" required:"true"`
	Roles []string     `json:"roles" required:"true" nullable:"false"`
}

type UpdatableServiceAccount struct {
	Name  string       `json:"name" required:"true"`
	Email valuer.Email `json:"email" required:"true"`
	Roles []string     `json:"roles" required:"true" nullable:"false"`
}

type UpdatableServiceAccountStatus struct {
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

func NewServiceAccountFromStorables(storableServiceAccount *StorableServiceAccount, roles []string) *ServiceAccount {
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

func NewServiceAccountsFromRoles(storableServiceAccounts []*StorableServiceAccount, roles []*roletypes.Role, serviceAccountIDToRoleIDsMap map[string][]valuer.UUID) []*ServiceAccount {
	serviceAccounts := make([]*ServiceAccount, 0, len(storableServiceAccounts))

	roleIDToRole := make(map[string]*roletypes.Role, len(roles))
	for _, role := range roles {
		roleIDToRole[role.ID.String()] = role
	}

	for _, sa := range storableServiceAccounts {
		roleIDs := serviceAccountIDToRoleIDsMap[sa.ID.String()]

		roleNames := make([]string, len(roleIDs))
		for idx, rid := range roleIDs {
			if role, ok := roleIDToRole[rid.String()]; ok {
				roleNames[idx] = role.Name
			}
		}

		account := NewServiceAccountFromStorables(sa, roleNames)
		serviceAccounts = append(serviceAccounts, account)
	}

	return serviceAccounts
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

func (sa *ServiceAccount) Update(name string, email valuer.Email, roles []string) {
	sa.Name = name
	sa.Email = email
	sa.Roles = roles
	sa.UpdatedAt = time.Now()
}

func (sa *ServiceAccount) UpdateStatus(status valuer.String) {
	sa.Status = status
	sa.UpdatedAt = time.Now()
}

func (sa *ServiceAccount) NewFactorAPIKey(name string, expiresAt uint64) (*FactorAPIKey, error) {
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
		ServiceAccountID: sa.ID,
	}, nil
}

func (sa *ServiceAccount) PatchRoles(input *ServiceAccount) ([]string, []string) {
	currentRolesSet := make(map[string]struct{}, len(sa.Roles))
	inputRolesSet := make(map[string]struct{}, len(input.Roles))

	for _, role := range sa.Roles {
		currentRolesSet[role] = struct{}{}
	}
	for _, role := range input.Roles {
		inputRolesSet[role] = struct{}{}
	}

	// additions: roles present in input but not in current
	additions := []string{}
	for _, role := range input.Roles {
		if _, exists := currentRolesSet[role]; !exists {
			additions = append(additions, role)
		}
	}

	// deletions: roles present in current but not in input
	deletions := []string{}
	for _, role := range sa.Roles {
		if _, exists := inputRolesSet[role]; !exists {
			deletions = append(deletions, role)
		}
	}

	return additions, deletions
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

	if len(temp.Roles) == 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "roles cannot be empty")
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

	if len(temp.Roles) == 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "roles cannot be empty")
	}

	*sa = UpdatableServiceAccount(temp)
	return nil
}

func (sa *UpdatableServiceAccountStatus) UnmarshalJSON(data []byte) error {
	type Alias UpdatableServiceAccountStatus

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if !slices.Contains(ValidStatus, temp.Status) {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeServiceAccountInvalidInput, "invalid status: %s, allowed status are: %v", temp.Status, ValidStatus)
	}

	*sa = UpdatableServiceAccountStatus(temp)
	return nil
}

func (sa *StorableServiceAccount) ToIdentity() *authtypes.Identity {
	return &authtypes.Identity{
		ServiceAccountID: sa.ID,
		Principal:        authtypes.PrincipalServiceAccount,
		OrgID:            valuer.MustNewUUID(sa.OrgID),
		Email:            valuer.MustNewEmail(sa.Email),
	}
}
