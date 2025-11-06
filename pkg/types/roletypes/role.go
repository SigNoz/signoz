package roletypes

import (
	"encoding/json"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"github.com/uptrace/bun"
)

var (
	ErrCodeRoleInvalidInput                 = errors.MustNewCode("role_invalid_input")
	ErrCodeRoleEmptyPatch                   = errors.MustNewCode("role_empty_patch")
	ErrCodeInvalidTypeRelation              = errors.MustNewCode("role_invalid_type_relation")
	ErrCodeRoleNotFound                     = errors.MustNewCode("role_not_found")
	ErrCodeRoleFailedTransactionsFromString = errors.MustNewCode("role_failed_transactions_from_string")
	ErrCodeRoleInvalidMembershipType        = errors.MustNewCode("role_invalid_membership_type")
)

var (
	MembershipTypeUser = valuer.NewString("user")
)

var (
	TypeableResourcesRoles = authtypes.MustNewTypeableMetaResources(authtypes.MustNewName("roles"))
)

var (
	RoleTypeManaged = valuer.NewString("managed")
	RoleTypeCustom  = valuer.NewString("custom")

	ManagedRoleSigNozAdminName        = "SigNoz Admin"
	ManagedRoleSigNozAdminDescription = "Default SigNoz Admin with all the permissions"

	ManagedRoleSigNozEditorName        = "SigNoz Editor"
	ManagedRoleSigNozEditorDescription = "Default SigNoz Editor with certain write permission"

	ManagedRoleSigNozViewerName        = "SigNoz Viewer"
	ManagedRoleSigNozViewerDescription = "Org member role with permissions to view and collaborate"
)

type StorableRole struct {
	bun.BaseModel `bun:"table:role"`

	types.Identifiable
	types.TimeAuditable
	DisplayName string `bun:"display_name,type:string"`
	Description string `bun:"description,type:string"`
	Type        string `bun:"type,type:boolean"`
	OrgID       string `bun:"org_id,type:string"`
}

type StorableUserRole struct {
	bun.BaseModel `bun:"table:user_role"`

	types.Identifiable
	RoleID string `bun:"role_id,type:text"`
	UserID string `bun:"user_id,type:text"`
}

type StorableMembership struct {
	Users []*StorableUserRole
}

type Role struct {
	types.Identifiable
	types.TimeAuditable
	DisplayName string      `json:"displayName"`
	Description string      `json:"description"`
	Type        string      `json:"type"`
	OrgID       valuer.UUID `json:"orgId"`
}

type GettableRole struct {
	types.Identifiable
	types.TimeAuditable
	DisplayName string      `json:"displayName"`
	Description string      `json:"description"`
	Type        string      `json:"type"`
	OrgID       valuer.UUID `json:"orgId"`
	Attributes  *Attributes `json:"attributes"`
}

type Attributes struct {
	UserCount int64 `json:"user_count"`
}

type Membership struct {
	Type valuer.String `json:"type"`
	User *types.User   `json:"user"`
}
type UpdatableMembership struct {
	Type   valuer.String `json:"type"`
	UserID valuer.UUID   `json:"userId"`
}

type PostableRole struct {
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
}

type PatchableRole struct {
	DisplayName *string `json:"displayName"`
	Description *string `json:"description"`
}

type PatchableObjects struct {
	Additions []*authtypes.Object `json:"additions"`
	Deletions []*authtypes.Object `json:"deletions"`
}

type PatchableMembership struct {
	Additions []*UpdatableMembership `json:"additions"`
	Deletions []*UpdatableMembership `json:"deletions"`
}

func NewStorableRole(displayName, description string, roleType valuer.String, orgID valuer.UUID) *StorableRole {
	return &StorableRole{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		DisplayName: displayName,
		Description: description,
		Type:        roleType.StringValue(),
		OrgID:       orgID.StringValue(),
	}
}

func MustNewStorableRole(displayName, description string, roleType valuer.String, orgID valuer.UUID) *StorableRole {
	return &StorableRole{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		DisplayName: displayName,
		Description: description,
		Type:        roleType.StringValue(),
		OrgID:       orgID.StringValue(),
	}
}

func NewStorableRoleFromRole(role *Role) (*StorableRole, error) {
	return &StorableRole{
		Identifiable:  role.Identifiable,
		TimeAuditable: role.TimeAuditable,
		DisplayName:   role.DisplayName,
		Description:   role.Description,
		Type:          role.Type,
		OrgID:         role.OrgID.StringValue(),
	}, nil
}

func NewRoleFromStorableRole(storableRole *StorableRole) (*Role, error) {
	return &Role{
		Identifiable:  storableRole.Identifiable,
		TimeAuditable: storableRole.TimeAuditable,
		DisplayName:   storableRole.DisplayName,
		Description:   storableRole.Description,
		Type:          storableRole.Type,
		OrgID:         valuer.MustNewUUID(storableRole.OrgID),
	}, nil
}

func NewRole(displayName, description string, roleType valuer.String, orgID valuer.UUID) *Role {
	return &Role{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		DisplayName: displayName,
		Description: description,
		Type:        roleType.StringValue(),
		OrgID:       orgID,
	}
}

func NewGettableRoleFromRole(role *Role, attributes *Attributes) *GettableRole {

	return &GettableRole{
		Identifiable:  role.Identifiable,
		TimeAuditable: role.TimeAuditable,
		DisplayName:   role.DisplayName,
		Description:   role.Description,
		Type:          role.Type,
		OrgID:         role.OrgID,
		Attributes:    attributes,
	}
}

func NewPatchableObjects(additions []*authtypes.Object, deletions []*authtypes.Object, relation authtypes.Relation) (*PatchableObjects, error) {
	if len(additions) == 0 && len(deletions) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty patch objects request received, at least one of additions or deletions must be present")
	}

	for _, object := range additions {
		if !slices.Contains(authtypes.TypeableRelations[object.Resource.Type], relation) {
			return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
		}
	}

	for _, object := range deletions {
		if !slices.Contains(authtypes.TypeableRelations[object.Resource.Type], relation) {
			return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
		}
	}

	return &PatchableObjects{Additions: additions, Deletions: deletions}, nil
}

func NewMembershipFromStorableMembership(storableMembership *StorableMembership, users []*types.User) []*Membership {
	usersMap := make(map[string]*types.User)
	for _, user := range users {
		usersMap[user.ID.String()] = user
	}

	membership := make([]*Membership, 0)
	for _, userRole := range storableMembership.Users {
		membership = append(membership, &Membership{
			Type: MembershipTypeUser,
			User: usersMap[userRole.UserID],
		})
	}

	return membership
}

func NewStorableMembershipFromUpdatableMemberships(id valuer.UUID, updatableMemberships []*UpdatableMembership) *StorableMembership {
	userMemberships := make([]*StorableUserRole, 0)
	for _, membership := range updatableMemberships {
		switch membership.Type {
		case MembershipTypeUser:
			userMemberships = append(userMemberships, &StorableUserRole{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				UserID: membership.UserID.StringValue(),
				RoleID: id.StringValue(),
			})
		}
	}

	return &StorableMembership{Users: userMemberships}
}

func MakeStorableMembership(users []*StorableUserRole) (*StorableMembership, error) {
	storableMembership := new(StorableMembership)
	storableMembership.Users = users

	return storableMembership, nil
}

func (role *Role) PatchMetadata(displayName, description *string) error {
	if !role.CanEditOrDelete() {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "cannot patch managed roles")
	}

	if displayName != nil {
		role.DisplayName = *displayName
	}
	if description != nil {
		role.Description = *description
	}
	role.UpdatedAt = time.Now()

	return nil
}

func (role *Role) CanEditOrDelete() bool {
	return role.Type == RoleTypeCustom.StringValue()
}

func (role *PostableRole) UnmarshalJSON(data []byte) error {
	type shadowPostableRole struct {
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
	}

	var shadowRole shadowPostableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.DisplayName == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "displayName is missing from the request")
	}

	role.DisplayName = shadowRole.DisplayName
	role.Description = shadowRole.Description

	return nil
}

func (role *PatchableRole) UnmarshalJSON(data []byte) error {
	type shadowPatchableRole struct {
		DisplayName *string `json:"displayName"`
		Description *string `json:"description"`
	}

	var shadowRole shadowPatchableRole
	if err := json.Unmarshal(data, &shadowRole); err != nil {
		return err
	}

	if shadowRole.DisplayName == nil && shadowRole.Description == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleEmptyPatch, "empty patch role request received, at least one of displayName or description must be present")
	}

	if shadowRole.DisplayName != nil && *shadowRole.DisplayName == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeRoleInvalidInput, "cannot set empty displayName for the role")
	}

	role.DisplayName = shadowRole.DisplayName
	role.Description = shadowRole.Description

	return nil
}

func (request *UpdatableMembership) UnmarshalJSON(data []byte) error {
	type Alias UpdatableMembership

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Type != MembershipTypeUser {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeRoleInvalidMembershipType, "invalid membership type, accepted values are :%s", MembershipTypeUser)
	}

	*request = UpdatableMembership(temp)
	return nil
}

func GetAdditionTuples(id valuer.UUID, orgID valuer.UUID, relation authtypes.Relation, additions []*authtypes.Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range additions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
			orgID,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}

func GetDeletionTuples(id valuer.UUID, orgID valuer.UUID, relation authtypes.Relation, deletions []*authtypes.Object) ([]*openfgav1.TupleKey, error) {
	tuples := make([]*openfgav1.TupleKey, 0)

	for _, object := range deletions {
		typeable := authtypes.MustNewTypeableFromType(object.Resource.Type, object.Resource.Name)
		transactionTuples, err := typeable.Tuples(
			authtypes.MustNewSubject(
				authtypes.TypeRole,
				id.String(),
				authtypes.RelationAssignee,
			),
			relation,
			[]authtypes.Selector{object.Selector},
			orgID,
		)
		if err != nil {
			return nil, err
		}

		tuples = append(tuples, transactionTuples...)
	}

	return tuples, nil
}
