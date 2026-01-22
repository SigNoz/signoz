package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type setter struct {
	store roletypes.Store
	authz authz.AuthZ
}

func NewSetter(store roletypes.Store, authz authz.AuthZ) role.Setter {
	return &setter{store: store, authz: authz}
}

func (setter *setter) Create(_ context.Context, _ valuer.UUID, _ *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) GetOrCreate(_ context.Context, _ valuer.UUID, _ *roletypes.Role) (*roletypes.Role, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) GetResources(_ context.Context) []*authtypes.Resource {
	return nil
}

func (setter *setter) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) Patch(_ context.Context, _ valuer.UUID, _ *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) PatchObjects(_ context.Context, _ valuer.UUID, _ valuer.UUID, _ authtypes.Relation, _, _ []*authtypes.Object) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) Delete(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (setter *setter) MustGetTypeables() []authtypes.Typeable {
	return nil
}
