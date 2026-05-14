package coretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidVerb = errors.MustNewCode("invalid_verb")
)

type Verb struct {
	valuer.String
	pastTense string
}

func NewVerb(verb string) (Verb, error) {
	switch verb {
	case "create":
		return VerbCreate, nil
	case "read":
		return VerbRead, nil
	case "update":
		return VerbUpdate, nil
	case "delete":
		return VerbDelete, nil
	case "list":
		return VerbList, nil
	case "assignee":
		return VerbAssignee, nil
	case "attach":
		return VerbAttach, nil
	default:
		return Verb{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidVerb, "verb %s is invalid, valid verbs are: %s", verb, Verb{}.Enum())
	}
}

func (Verb) Enum() []any {
	return []any{
		VerbCreate,
		VerbRead,
		VerbUpdate,
		VerbDelete,
		VerbList,
		VerbAssignee,
		VerbAttach,
	}
}

func (verb Verb) PastTense() string {
	return verb.pastTense
}
