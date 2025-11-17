package authtypes

func NewSubject(subjectType Type, selector string, relation *Relation) (string, error) {
	if relation == nil {
		return subjectType.StringValue() + ":" + selector, nil
	}

	return subjectType.StringValue() + ":" + selector + "#" + relation.StringValue(), nil
}

func MustNewSubject(subjectType Type, selector string, relation *Relation) string {
	subject, err := NewSubject(subjectType, selector, relation)
	if err != nil {
		panic(err)
	}

	return subject
}
