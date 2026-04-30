package dashboardtypes

import (
	_ "embed"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Source string

const (
	SourceAIO11yOverview Source = "ai-o11y-overview"
)

var SystemSources = []Source{
	SourceAIO11yOverview,
}

//go:embed ai_o11y_overview.json
var aiO11yOverviewJSON []byte

func NewDefaultSystemDashboard(orgID valuer.UUID, source Source) (*Dashboard, error) {
	switch source {
	case SourceAIO11yOverview:
		return newDefaultAIO11yOverview(orgID)
	default:
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no defaults registered for system dashboard source %s", source)
	}
}

func newDefaultAIO11yOverview(orgID valuer.UUID) (*Dashboard, error) {
	data := StorableDashboardData{}
	if err := json.Unmarshal(aiO11yOverviewJSON, &data); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal embedded ai-o11y-overview default")
	}

	return NewDashboard(orgID, "system", data, SourceAIO11yOverview)
}
