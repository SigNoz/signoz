package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type PostableEmailPasswordSession struct {
	Email    string      `json:"email"`
	Password string      `json:"password"`
	OrgID    valuer.UUID `json:"orgId"`
}
