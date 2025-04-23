package quickFilters

import (
	"context"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
)

type Usecase interface {
	GetOrgQuickFilters(ctx context.Context, orgID string) ([]*quickfiltertypes.SignalFilters, error)
	UpdateOrgQuickFilters(ctx context.Context, orgID string, signal string, filters []v3.AttributeKey) error
	GetSignalFilters(ctx context.Context, orgID string, signal string) (*quickfiltertypes.SignalFilters, error)
}
