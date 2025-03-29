package licensetypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Community struct{}

func NewCommunity() License {
	return &Community{}
}

func (c *Community) ID() valuer.UUID {
	return valuer.UUID{}
}

func (c *Community) Key() string {
	return ""
}

func (c *Community) CreatedAt() time.Time {
	return time.Time{}
}

func (c *Community) UpdatedAt() time.Time {
	return time.Time{}
}
