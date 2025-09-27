package authtypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var _ Typeable = new(user)

type user struct{}

func (user *user) Tuples(subject string, relation Relation, selector Selector, parentTypeable Typeable, parentSelectors ...Selector) ([]*openfgav1.CheckRequestTupleKey, error) {
	tuples := make([]*openfgav1.CheckRequestTupleKey, 0)
	for _, selector := range parentSelectors {
		resourcesTuples, err := parentTypeable.Tuples(subject, relation, selector, nil)
		if err != nil {
			return nil, err
		}
		tuples = append(tuples, resourcesTuples...)
	}

	object := strings.Join([]string{TypeUser.StringValue(), selector.String()}, ":")
	tuples = append(tuples, &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation.StringValue(), Object: object})

	return tuples, nil
}

func (user *user) Type() Type {
	return TypeUser
}

type AuthenticatedUser struct {
	UserID valuer.UUID `json:"userId"`
	OrgID  valuer.UUID `json:"orgId"`
	Email  string      `json:"email"`
	Role   types.Role  `json:"role"`
}

func NewAuthenticatedUser(userID valuer.UUID, orgID valuer.UUID, email string, role types.Role) *AuthenticatedUser {
	return &AuthenticatedUser{
		UserID: userID,
		OrgID:  orgID,
		Email:  email,
		Role:   role,
	}
}

func (typ AuthenticatedUser) MarshalBinary() ([]byte, error) {
	return json.Marshal(typ)
}

func (typ *AuthenticatedUser) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, typ)
}

func (typ *AuthenticatedUser) ToClaims() Claims {
	return Claims{
		UserID: typ.UserID.String(),
		Email:  typ.Email,
		Role:   typ.Role,
		OrgID:  typ.OrgID.String(),
	}
}
