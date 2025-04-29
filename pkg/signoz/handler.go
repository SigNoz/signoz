package signoz

import (
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
)

type Handlers struct {
	Organization organization.Handler
	Preference   preference.Handler
	TraceFunnel  tracefunnel.Handler
}

func NewHandlers(modules Modules) Handlers {
	return Handlers{
		Organization: implorganization.NewHandler(modules.Organization),
		Preference:   implpreference.NewHandler(modules.Preference),
		TraceFunnel:  impltracefunnel.NewHandler(modules.TraceFunnel),
	}
}
