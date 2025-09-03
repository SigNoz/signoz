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

func NewSubject(comment map[string]string) (string, error) {
	authType, ok := comment["auth_type"]
	if !ok {
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "auth_type is missing in comment context")
	}

	switch authType {
	case ctxtypes.AuthTypeAPIKey.StringValue():
		userID, ok := comment["user_id"]
		if !ok {
			return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "user_id is missing in comment context for auth_type %s", authType)
		}
		userSubject := NewUser(valuer.MustNewUUID(userID))

		return userSubject.StringValue(), nil
	case ctxtypes.AuthTypeAPIKey.StringValue():
		apiKeyID, ok := comment["api_key_id"]
		if !ok {
			return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "api_key_id is missing in comment context for auth_type %s", authType)
		}
		apiKeySubject := NewAPIKey(valuer.MustNewUUID(apiKeyID))

		return apiKeySubject.StringValue(), nil
	default:
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid auth_type %s", authType)
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
