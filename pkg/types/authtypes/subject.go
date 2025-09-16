package authtypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	supportedSubjectTypes = []Type{TypeUser, TypeRole}
)

func NewSubject(subjectType Type, selector string, relation Relation) (string, error) {
	if !slices.Contains(supportedSubjectTypes, subjectType) {
		return "", errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSubject, "unsupported subject type %s, supported subject types are %v", subjectType.StringValue(), supportedSubjectTypes)
	}

	switch subjectType {
	case TypeUser:
		if !slices.Contains(typeUserSupportedRelations, relation) {
			return "", errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZUnsupportedRelation, "unsupported relation for type %s, supported relations are %v", TypeUser.StringValue(), typeUserSupportedRelations)
		}
	case TypeRole:
		if !slices.Contains(typeRoleSupportedRelations, relation) {
			return "", errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZUnsupportedRelation, "unsupported relation for type %s, supported relations are %v", TypeRole.StringValue(), typeRoleSupportedRelations)
		}
	}

	if relation.IsZero() {
		return subjectType.StringValue() + ":" + selector, nil
	}

	return subjectType.StringValue() + ":" + selector + "#" + relation.StringValue(), nil
}

func MustNewSubject(subjectType Type, selector string, relation Relation) string {
	subject, err := NewSubject(subjectType, selector, relation)
	if err != nil {
		panic(err)
	}

	return subject
}
