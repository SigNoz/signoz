package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

func NewSubject(subjectType Typeable, selector string, orgID valuer.UUID, relation *Relation) (string, error) {
	if relation == nil {
		return subjectType.Prefix(orgID) + "/" + selector, nil
	}

	return subjectType.Prefix(orgID) + "/" + selector + "#" + relation.StringValue(), nil
}

func MustNewSubject(subjectType Typeable, selector string, orgID valuer.UUID, relation *Relation) string {
	subject, err := NewSubject(subjectType, selector, orgID, relation)
	if err != nil {
		panic(err)
	}

	return subject
}
