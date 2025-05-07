package types

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Identifiable struct {
	ID valuer.UUID `json:"id" bun:"id,pk,type:text"`
}
