package signoz

import (
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
)

type Handlers struct {
	Organization organization.Handler
	Preference   preference.Handler
	User         user.Handler
}

func NewHandlers(modules Modules) Handlers {
	return Handlers{
		Organization: implorganization.NewHandler(modules.Organization),
		Preference:   implpreference.NewHandler(modules.Preference),
		User:         impluser.NewHandler(modules.User),
	}
}
