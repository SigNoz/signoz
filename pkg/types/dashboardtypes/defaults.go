package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func NewDefaultSystemDashboard(orgID valuer.UUID) (*Dashboard, error) {
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no defaults registered for system dashboard")
}
