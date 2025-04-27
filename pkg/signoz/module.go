package signoz

import (
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Modules struct {
	Organization organization.Module
	Preference   preference.Module
}

func NewModules(sqlstore sqlstore.SQLStore) Modules {
	return Modules{
		Organization: implorganization.NewModule(implorganization.NewStore(sqlstore)),
		Preference:   implpreference.NewModule(implpreference.NewStore(sqlstore), preferencetypes.NewDefaultPreferenceMap()),
	}
}
