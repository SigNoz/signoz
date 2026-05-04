package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Source string

var SystemSources = []Source{}

func NewDefaultSystemDashboard(orgID valuer.UUID, source Source) (*Dashboard, error) {
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no defaults registered for system dashboard source %s", source)
}
