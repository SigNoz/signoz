package coretypes

type Transaction struct {
	Verb   Verb   `json:"verb" required:"true"`
	Object Object `json:"object" required:"true"`
}

func NewTransaction(verb Verb, object Object) (*Transaction, error) {
	if err := ErrIfVerbNotValidForType(verb, object.Resource.Type); err != nil {
		return nil, err
	}

	return &Transaction{Verb: verb, Object: object}, nil
}
