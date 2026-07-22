package implauthdomain

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store authtypes.AuthDomainStore
}

func NewGetter(store authtypes.AuthDomainStore) authdomain.Getter {
	return &getter{store: store}
}

func (getter *getter) OnBeforeRoleDelete(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID, roleName string) error {
	domains, err := getter.store.ListByOrgID(ctx, orgID)
	if err != nil {
		return err
	}

	referencedBy := make([]string, 0)
	for _, domain := range domains {
		for _, mappedRole := range domain.AuthDomainConfig().RoleMapping.RoleNames() {
			if mappedRole == roleName {
				referencedBy = append(referencedBy, domain.StorableAuthDomain().Name)
				break
			}
		}
	}

	if len(referencedBy) > 0 {
		return errors.WithAdditionalf(
			errors.New(errors.TypeInvalidInput, authtypes.ErrCodeRoleHasAuthDomainMappings, "role is referenced by an SSO role mapping, remove it before deleting"),
			"referenced by auth domain(s): %s", strings.Join(referencedBy, ", "),
		)
	}

	return nil
}
