package authztypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

// subject
type User struct{ valuer.String }
type APIKey struct{ valuer.String }

// relation
type Relation struct{ valuer.String }

// object
type Role struct{ valuer.String }
type Organization struct{ valuer.String }

var (
	RoleViewer = Role{valuer.NewString(types.RoleViewer.String())}
	RoleEditor = Role{valuer.NewString(types.RoleEditor.String())}
	RoleAdmin  = Role{valuer.NewString(types.RoleAdmin.String())}
)

var (
	RelationView  = Relation{valuer.NewString("view")}
	RelationEdit  = Relation{valuer.NewString("edit")}
	RelationAdmin = Relation{valuer.NewString("admin")}
)

func NewUser(id valuer.UUID) *User {
	return &User{valuer.NewString("user:" + id.String())}
}

func NewAPIKey(id valuer.UUID) *APIKey {
	return &APIKey{valuer.NewString("apikey:" + id.String())}
}

func NewSubjectFromAuth(auth ctxtypes.Auth) (string, error) {
	switch auth.Type {
	case ctxtypes.AuthTypeJWT:
		userSubject := NewUser(auth.UserID)
		return userSubject.StringValue(), nil
	case ctxtypes.AuthTypeAPIKey:
		apiKeySubject := NewAPIKey(auth.APIKeyID)
		return apiKeySubject.StringValue(), nil
	default:
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid auth_type %s", auth.Type)
	}
}

func NewRole(role types.Role) *Role {
	return &Role{valuer.NewString("role:" + role.String())}
}

func NewOrganization(id valuer.UUID) *Organization {
	return &Organization{valuer.NewString("organization:" + id.String())}
}

func GenerateOpenfgaTuple(subject string, relation Relation, object string) *openfgav1.CheckRequestTupleKey {
	return &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation.StringValue(), Object: object}
}
