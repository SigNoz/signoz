package openfgaauthz

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/authz"
	pkgopenfgaauthz "github.com/SigNoz/signoz/pkg/authz/openfgaauthz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type provider struct {
	pkgAuthzService authz.AuthZ
	licensing       licensing.Licensing
	store           roletypes.Store
	registry        []authz.RegisterTypeable
}

func NewProviderFactory(sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile, licensing licensing.Licensing) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstore, openfgaSchema, licensing)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile, licensing licensing.Licensing) (authz.AuthZ, error) {
	pkgOpenfgaAuthzProvider := pkgopenfgaauthz.NewProviderFactory(sqlstore, openfgaSchema)
	pkgAuthzService, err := pkgOpenfgaAuthzProvider.New(ctx, settings, config)
	if err != nil {
		return nil, err
	}

	return &provider{
		pkgAuthzService: pkgAuthzService,
		licensing:       licensing,
		store:           pkgopenfgaauthz.NewStore(sqlstore),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.pkgAuthzService.Start(ctx)
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.pkgAuthzService.Stop(ctx)
}

func (provider *provider) Check(ctx context.Context, tuple *openfgav1.TupleKey) error {
	return provider.pkgAuthzService.Check(ctx, tuple)
}

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableUser, claims.UserID, orgID, nil)
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	err = provider.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.String(), orgID, nil)
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	err = provider.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) BatchCheck(ctx context.Context, tuples []*openfgav1.TupleKey) error {
	return provider.pkgAuthzService.BatchCheck(ctx, tuples)
}

func (provider *provider) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	return provider.pkgAuthzService.ListObjects(ctx, subject, relation, typeable)
}

func (provider *provider) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return provider.pkgAuthzService.Write(ctx, additions, deletions)
}

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.Role, error) {
	return provider.pkgAuthzService.Get(ctx, orgID, id)
}

func (provider *provider) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*roletypes.Role, error) {
	return provider.pkgAuthzService.GetByOrgIDAndName(ctx, orgID, name)
}

func (provider *provider) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.Role, error) {
	return provider.pkgAuthzService.List(ctx, orgID)
}

func (provider *provider) ListByOrgIDAndNames(ctx context.Context, orgID valuer.UUID, names []string) ([]*roletypes.Role, error) {
	return provider.pkgAuthzService.ListByOrgIDAndNames(ctx, orgID, names)
}

func (provider *provider) Grant(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	return provider.pkgAuthzService.Grant(ctx, orgID, name, subject)
}

func (provider *provider) ModifyGrant(ctx context.Context, orgID valuer.UUID, existingRoleName string, updatedRoleName string, subject string) error {
	return provider.pkgAuthzService.ModifyGrant(ctx, orgID, existingRoleName, updatedRoleName, subject)
}

func (provider *provider) Revoke(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	return provider.pkgAuthzService.Revoke(ctx, orgID, name, subject)
}

func (provider *provider) CreateManagedRoles(ctx context.Context, orgID valuer.UUID, managedRoles []*roletypes.Role) error {
	return provider.pkgAuthzService.CreateManagedRoles(ctx, orgID, managedRoles)
}

func (provider *provider) Create(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return provider.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
}

func (provider *provider) GetOrCreate(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) (*roletypes.Role, error) {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	existingRole, err := provider.store.GetByOrgIDAndName(ctx, role.OrgID, role.Name)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
	}

	if existingRole != nil {
		return roletypes.NewRoleFromStorableRole(existingRole), nil
	}

	err = provider.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (provider *provider) GetResources(_ context.Context) []*authtypes.Resource {
	typeables := make([]authtypes.Typeable, 0)
	for _, register := range provider.registry {
		typeables = append(typeables, register.MustGetTypeables()...)
	}
	// role module cannot self register itself!
	typeables = append(typeables, provider.MustGetTypeables()...)

	resources := make([]*authtypes.Resource, 0)
	for _, typeable := range typeables {
		resources = append(resources, &authtypes.Resource{Name: typeable.Name(), Type: typeable.Type()})
	}

	return resources
}

func (provider *provider) GetObjects(ctx context.Context, orgID valuer.UUID, id valuer.UUID, relation authtypes.Relation) ([]*authtypes.Object, error) {
	storableRole, err := provider.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	objects := make([]*authtypes.Object, 0)
	for _, resource := range provider.GetResources(ctx) {
		if slices.Contains(authtypes.TypeableRelations[resource.Type], relation) {
			resourceObjects, err := provider.
				ListObjects(
					ctx,
					authtypes.MustNewSubject(authtypes.TypeableRole, storableRole.ID.String(), orgID, &authtypes.RelationAssignee),
					relation,
					authtypes.MustNewTypeableFromType(resource.Type, resource.Name),
				)
			if err != nil {
				return nil, err
			}

			objects = append(objects, resourceObjects...)
		}
	}

	return objects, nil
}

func (provider *provider) Patch(ctx context.Context, orgID valuer.UUID, role *roletypes.Role) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return provider.store.Update(ctx, orgID, roletypes.NewStorableRoleFromRole(role))
}

func (provider *provider) PatchObjects(ctx context.Context, orgID valuer.UUID, name string, relation authtypes.Relation, additions, deletions []*authtypes.Object) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	additionTuples, err := roletypes.GetAdditionTuples(name, orgID, relation, additions)
	if err != nil {
		return err
	}

	deletionTuples, err := roletypes.GetDeletionTuples(name, orgID, relation, deletions)
	if err != nil {
		return err
	}

	err = provider.Write(ctx, additionTuples, deletionTuples)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableRole, err := provider.store.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	role := roletypes.NewRoleFromStorableRole(storableRole)
	err = role.CanEditDelete()
	if err != nil {
		return err
	}

	return provider.store.Delete(ctx, orgID, id)
}

func (provider *provider) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{authtypes.TypeableRole, roletypes.TypeableResourcesRoles}
}
