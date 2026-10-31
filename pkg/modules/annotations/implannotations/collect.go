package implannotations

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) Collect(_ context.Context, _ valuer.UUID) (map[string]any, error) {
	return map[string]any{}, nil
}
