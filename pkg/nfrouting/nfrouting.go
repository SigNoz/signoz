package nfrouting

import (
	"context"
	"github.com/prometheus/common/model"
)

type NotificationRoutes interface {
	Match(ctx context.Context, orgID string, set model.LabelSet) []string
}
