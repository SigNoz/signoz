package signoz

import (
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/user"
)

type Handlers struct {
	Organization organization.Handler
	Preference   preference.Handler
	User         user.Handler
	SavedView    savedview.Handler
}

func NewHandlers(modules Modules, user user.Handler) Handlers {
	return Handlers{
		Organization: implorganization.NewHandler(modules.Organization),
		Preference:   implpreference.NewHandler(modules.Preference),
		User:         user,
		SavedView:    implsavedview.NewHandler(modules.SavedView),
	}
}
