package authtypes

import "github.com/SigNoz/signoz/pkg/types/coretypes"

type Relation struct {
	coretypes.Verb
}

func (Relation) Enum() []any {
	return coretypes.Verb{}.Enum()
}
