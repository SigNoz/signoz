package openfgaauthz

import (
	"context"

	authz "github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/authzstore/sqlauthzstore"
	"github.com/SigNoz/signoz/pkg/authz/openfgaserver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type provider struct {
	server *openfgaserver.Server
	store  roletypes.Store
}

func NewProviderFactory(sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstore, openfgaSchema)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) (authz.AuthZ, error) {
	server, err := openfgaserver.NewOpenfgaServer(ctx, settings, config, sqlstore, openfgaSchema)
	if err != nil {
		return nil, err
	}

	return &provider{
		server: server,
		store:  sqlauthzstore.NewSqlAuthzStore(sqlstore),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.server.Start(ctx)
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.server.Stop(ctx)
}

func (provider *provider) BatchCheck(ctx context.Context, tupleReq map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error) {
	return provider.server.BatchCheck(ctx, tupleReq)
}

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, roleSelectors []authtypes.Selector) error {
	return provider.server.CheckWithTupleCreation(ctx, claims, orgID, relation, typeable, selectors, roleSelectors)
}

func (provider *provider) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, roleSelectors []authtypes.Selector) error {
	return provider.server.CheckWithTupleCreationWithoutClaims(ctx, orgID, relation, typeable, selectors, roleSelectors)
}

func (provider *provider) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return provider.server.Write(ctx, additions, deletions)
}

func (provider *provider) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	return provider.server.ListObjects(ctx, subject, relation, typeable)
}

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.Role, error) {
	storableRole, err := provider.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (provider *provider) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*roletypes.Role, error) {
	storableRole, err := provider.store.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return nil, err
	}

	return roletypes.NewRoleFromStorableRole(storableRole), nil
}

func (provider *provider) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.Role, error) {
	storableRoles, err := provider.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, len(storableRoles))
	for idx, storableRole := range storableRoles {
		roles[idx] = roletypes.NewRoleFromStorableRole(storableRole)
	}

	return roles, nil
}

func (provider *provider) ListByOrgIDAndNames(ctx context.Context, orgID valuer.UUID, names []string) ([]*roletypes.Role, error) {
	storableRoles, err := provider.store.ListByOrgIDAndNames(ctx, orgID, names)
	if err != nil {
		return nil, err
	}

	roles := make([]*roletypes.Role, len(storableRoles))
	for idx, storable := range storableRoles {
		roles[idx] = roletypes.NewRoleFromStorableRole(storable)
	}

	return roles, nil
}

func (provider *provider) Grant(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, name),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return provider.Write(ctx, tuples, nil)
}

func (provider *provider) ModifyGrant(ctx context.Context, orgID valuer.UUID, existingRoleName string, updatedRoleName string, subject string) error {
	err := provider.Revoke(ctx, orgID, existingRoleName, subject)
	if err != nil {
		return err
	}

	err = provider.Grant(ctx, orgID, updatedRoleName, subject)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Revoke(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, name),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return provider.Write(ctx, nil, tuples)
}

func (provider *provider) CreateManagedRoles(ctx context.Context, _ valuer.UUID, managedRoles []*roletypes.Role) error {
	err := provider.store.RunInTx(ctx, func(ctx context.Context) error {
		for _, role := range managedRoles {
			err := provider.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) CreateManagedUserRoleTransactions(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error {
	return provider.Grant(ctx, orgID, roletypes.SigNozAdminRoleName, authtypes.MustNewSubject(authtypes.TypeableUser, userID.String(), orgID, nil))
}

func (setter *provider) Create(_ context.Context, _ valuer.UUID, _ *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) GetOrCreate(_ context.Context, _ valuer.UUID, _ *roletypes.Role) (*roletypes.Role, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) GetResources(_ context.Context) []*authtypes.Resource {
	return nil
}

func (provider *provider) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	return nil, errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) Patch(_ context.Context, _ valuer.UUID, _ *roletypes.Role) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) PatchObjects(_ context.Context, _ valuer.UUID, _ string, _ authtypes.Relation, _, _ []*authtypes.Object) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) Delete(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, roletypes.ErrCodeRoleUnsupported, "not implemented")
}

func (provider *provider) MustGetTypeables() []authtypes.Typeable {
	return nil
}
