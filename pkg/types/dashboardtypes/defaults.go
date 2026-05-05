package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Source string

var SystemSources = []Source{}

// This will be fixed with upcoming pr of dashboard default value.
// No issue with migration or org creation; if reset endpoint is called we get a 400
// invalid_input response and no action is taken on dashboard.data.
func NewDefaultSystemDashboard(orgID valuer.UUID, source Source) (*Dashboard, error) {
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no defaults registered for system dashboard source %s", source)
}
