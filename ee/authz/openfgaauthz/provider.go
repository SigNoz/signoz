package openfgaauthz

import (
	"context"

	"github.com/SigNoz/signoz/ee/authz/openfgaserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/authzstore/sqlauthzstore"
	pkgopenfgaauthz "github.com/SigNoz/signoz/pkg/authz/openfgaauthz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
	"github.com/openfga/openfga/pkg/storage"
)

type provider struct {
	config             authz.Config
	pkgAuthzService    authz.AuthZ
	openfgaServer      *openfgaserver.Server
	licensing          licensing.Licensing
	store              authtypes.RoleStore
	registry           *authtypes.Registry
	settings           factory.ScopedProviderSettings
	onBeforeRoleDelete []authz.OnBeforeRoleDelete
}

func NewProviderFactory(sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile, openfgaDataStore storage.OpenFGADatastore, licensing licensing.Licensing, onBeforeRoleDelete []authz.OnBeforeRoleDelete, registry *authtypes.Registry) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstore, openfgaSchema, openfgaDataStore, licensing, onBeforeRoleDelete, registry)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile, openfgaDataStore storage.OpenFGADatastore, licensing licensing.Licensing, onBeforeRoleDelete []authz.OnBeforeRoleDelete, registry *authtypes.Registry) (authz.AuthZ, error) {
	pkgOpenfgaAuthzProvider := pkgopenfgaauthz.NewProviderFactory(sqlstore, openfgaSchema, openfgaDataStore, registry)
	pkgAuthzService, err := pkgOpenfgaAuthzProvider.New(ctx, settings, config)
	if err != nil {
		return nil, err
	}

	openfgaServer, err := openfgaserver.NewOpenfgaServer(ctx, pkgAuthzService)
	if err != nil {
		return nil, err
	}

	scopedSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/ee/authz/openfgaauthz")

	return &provider{
		config:             config,
		pkgAuthzService:    pkgAuthzService,
		openfgaServer:      openfgaServer,
		licensing:          licensing,
		store:              sqlauthzstore.NewSqlAuthzStore(sqlstore),
		registry:           registry,
		settings:           scopedSettings,
		onBeforeRoleDelete: onBeforeRoleDelete,
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.openfgaServer.Start(ctx)
}

func (provider *provider) Healthy() <-chan struct{} {
	return provider.openfgaServer.Healthy()
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.openfgaServer.Stop(ctx)
}

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable coretypes.Resource, selectors []coretypes.Selector, roleSelectors []coretypes.Selector) error {
	return provider.openfgaServer.CheckWithTupleCreation(ctx, claims, orgID, relation, typeable, selectors, roleSelectors)
}

func (provider *provider) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable coretypes.Resource, selectors []coretypes.Selector, roleSelectors []coretypes.Selector) error {
	return provider.openfgaServer.CheckWithTupleCreationWithoutClaims(ctx, orgID, relation, typeable, selectors, roleSelectors)
}

func (provider *provider) BatchCheck(ctx context.Context, tupleReq map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error) {
	return provider.openfgaServer.BatchCheck(ctx, tupleReq)
}

func (provider *provider) CheckTransactions(ctx context.Context, subject string, orgID valuer.UUID, transactions []*authtypes.Transaction) ([]*authtypes.TransactionWithAuthorization, error) {
	tuples, correlations, err := authtypes.NewTuplesFromTransactionsWithCorrelations(transactions, subject, orgID)
	if err != nil {
		return nil, err
	}

	batchResults, err := provider.openfgaServer.BatchCheck(ctx, tuples)
	if err != nil {
		return nil, err
	}

	results := make([]*authtypes.TransactionWithAuthorization, len(transactions))
	for i, txn := range transactions {
		txnID := txn.ID.StringValue()
		authorized := batchResults[txnID].Authorized

		if !authorized {
			for _, correlationID := range correlations[txnID] {
				if result, exists := batchResults[correlationID]; exists && result.Authorized {
					authorized = true
					break
				}
			}
		}

		results[i] = &authtypes.TransactionWithAuthorization{
			Transaction: txn,
			Authorized:  authorized,
		}
	}
	return results, nil
}

func (provider *provider) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, objectType coretypes.Type) ([]*coretypes.Object, error) {
	return provider.openfgaServer.ListObjects(ctx, subject, relation, objectType)
}

func (provider *provider) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return provider.openfgaServer.Write(ctx, additions, deletions)
}

func (provider *provider) ReadTuples(ctx context.Context, tupleKey *openfgav1.ReadRequestTupleKey) ([]*openfgav1.TupleKey, error) {
	return provider.openfgaServer.ReadTuples(ctx, tupleKey)
}

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*authtypes.Role, error) {
	return provider.pkgAuthzService.Get(ctx, orgID, id)
}

func (provider *provider) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*authtypes.Role, error) {
	return provider.pkgAuthzService.GetByOrgIDAndName(ctx, orgID, name)
}

func (provider *provider) List(ctx context.Context, orgID valuer.UUID) ([]*authtypes.Role, error) {
	return provider.pkgAuthzService.List(ctx, orgID)
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	return provider.pkgAuthzService.Collect(ctx, orgID)
}

func (provider *provider) ListByOrgIDAndNames(ctx context.Context, orgID valuer.UUID, names []string) ([]*authtypes.Role, error) {
	return provider.pkgAuthzService.ListByOrgIDAndNames(ctx, orgID, names)
}

func (provider *provider) ListByOrgIDAndIDs(ctx context.Context, orgID valuer.UUID, ids []valuer.UUID) ([]*authtypes.Role, error) {
	return provider.pkgAuthzService.ListByOrgIDAndIDs(ctx, orgID, ids)
}

func (provider *provider) Grant(ctx context.Context, orgID valuer.UUID, names []string, subject string) error {
	return provider.pkgAuthzService.Grant(ctx, orgID, names, subject)
}

func (provider *provider) ModifyGrant(ctx context.Context, orgID valuer.UUID, existingRoleNames []string, updatedRoleNames []string, subject string) error {
	return provider.pkgAuthzService.ModifyGrant(ctx, orgID, existingRoleNames, updatedRoleNames, subject)
}

func (provider *provider) Revoke(ctx context.Context, orgID valuer.UUID, names []string, subject string) error {
	return provider.pkgAuthzService.Revoke(ctx, orgID, names, subject)
}

func (provider *provider) CreateManagedRoles(ctx context.Context, orgID valuer.UUID, managedRoles []*authtypes.Role) error {
	return provider.pkgAuthzService.CreateManagedRoles(ctx, orgID, managedRoles)
}

func (provider *provider) CreateManagedUserRoleTransactions(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error {
	tuples := make([]*openfgav1.TupleKey, 0)

	grantTuples := provider.getManagedRoleGrantTuples(orgID, userID)
	tuples = append(tuples, grantTuples...)

	managedRoleTuples := provider.getManagedRoleTransactionTuples(orgID)
	tuples = append(tuples, managedRoleTuples...)

	return provider.Write(ctx, tuples, nil)
}

func (provider *provider) Create(ctx context.Context, orgID valuer.UUID, role *authtypes.RoleWithTransactionGroups) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	existingRole, err := provider.GetByOrgIDAndName(ctx, orgID, role.Name)
	if err != nil && !errors.Asc(err, authtypes.ErrCodeRoleNotFound) {
		return err
	}

	if existingRole != nil {
		return errors.Newf(errors.TypeAlreadyExists, authtypes.ErrCodeRoleAlreadyExists, "role with name: %s already exists", existingRole.Name)
	}

	tuples, err := authtypes.NewTuplesFromTransactionGroups(role.Name, orgID, role.TransactionGroups)
	if err != nil {
		return err
	}

	err = provider.Write(ctx, tuples, nil)
	if err != nil {
		return err
	}

	if err := provider.store.Create(ctx, role.Role); err != nil {
		return err
	}

	return nil
}

func (provider *provider) GetOrCreate(ctx context.Context, orgID valuer.UUID, role *authtypes.Role) (*authtypes.Role, error) {
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
		return existingRole, nil
	}

	err = provider.store.Create(ctx, role)
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (provider *provider) GetWithTransactionGroups(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*authtypes.RoleWithTransactionGroups, error) {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	role, err := provider.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	tuples, err := provider.readAllTuplesForRole(ctx, role.Name, orgID)
	if err != nil {
		return nil, err
	}

	transactionGroups := authtypes.MustNewTransactionGroupsFromTuples(tuples)
	return authtypes.MakeRoleWithTransactionGroups(role, transactionGroups), nil
}

func (provider *provider) Update(ctx context.Context, orgID valuer.UUID, updatedRole *authtypes.RoleWithTransactionGroups) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	existingRole, err := provider.GetWithTransactionGroups(ctx, orgID, updatedRole.ID)
	if err != nil {
		return err
	}

	additions, deletions := existingRole.TransactionGroups.Diff(updatedRole.TransactionGroups)
	additionTuples, err := authtypes.NewTuplesFromTransactionGroups(existingRole.Name, orgID, additions)
	if err != nil {
		return err
	}

	deletionTuples, err := authtypes.NewTuplesFromTransactionGroups(existingRole.Name, orgID, deletions)
	if err != nil {
		return err
	}

	err = provider.Write(ctx, additionTuples, deletionTuples)
	if err != nil {
		return err
	}

	return provider.store.Update(ctx, orgID, updatedRole.Role)
}

func (provider *provider) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := provider.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	role, err := provider.GetWithTransactionGroups(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = role.ErrIfManaged()
	if err != nil {
		return err
	}

	for _, cb := range provider.onBeforeRoleDelete {
		if err := cb(ctx, orgID, id, role.Name); err != nil {
			return err
		}
	}

	tuples, err := authtypes.NewTuplesFromTransactionGroups(role.Name, orgID, role.TransactionGroups)
	if err != nil {
		return err
	}

	if err := provider.Write(ctx, nil, tuples); err != nil {
		return errors.WithAdditionalf(err, "failed to delete tuples for the role: %s", role.Name)
	}

	return provider.store.Delete(ctx, orgID, id)
}

func (provider *provider) getManagedRoleGrantTuples(orgID valuer.UUID, userID valuer.UUID) []*openfgav1.TupleKey {
	tuples := []*openfgav1.TupleKey{}

	// Grant the admin role to the user
	adminSubject := authtypes.MustNewSubject(coretypes.NewResourceUser(), userID.String(), orgID, nil)
	adminTuple := authtypes.NewTuples(
		coretypes.NewResourceRole(),
		adminSubject,
		authtypes.Relation{Verb: coretypes.VerbAssignee},
		[]coretypes.Selector{coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName)},
		orgID,
	)
	tuples = append(tuples, adminTuple...)

	// Grant the admin role to the anonymous user
	anonymousSubject := authtypes.MustNewSubject(coretypes.NewResourceAnonymous(), coretypes.AnonymousUser.String(), orgID, nil)
	anonymousTuple := authtypes.NewTuples(
		coretypes.NewResourceRole(),
		anonymousSubject,
		authtypes.Relation{Verb: coretypes.VerbAssignee},
		[]coretypes.Selector{coretypes.TypeRole.MustSelector(authtypes.SigNozAnonymousRoleName)},
		orgID,
	)
	tuples = append(tuples, anonymousTuple...)

	return tuples
}

func (provider *provider) getManagedRoleTransactionTuples(orgID valuer.UUID) []*openfgav1.TupleKey {
	tuples := make([]*openfgav1.TupleKey, 0)
	for roleName, transactions := range provider.registry.ManagedRoleTransactions() {
		for _, txn := range transactions {
			resource := coretypes.MustNewResourceFromTypeAndKind(txn.Object.Resource.Type, txn.Object.Resource.Kind)
			txnTuples := authtypes.NewTuples(
				resource,
				authtypes.MustNewSubject(
					coretypes.NewResourceRole(),
					roleName,
					orgID,
					&coretypes.VerbAssignee,
				),
				txn.Relation,
				[]coretypes.Selector{txn.Object.Selector},
				orgID,
			)
			tuples = append(tuples, txnTuples...)
		}
	}

	return tuples
}

func (provider *provider) readAllTuplesForRole(ctx context.Context, roleName string, orgID valuer.UUID) ([]*openfgav1.TupleKey, error) {
	subject := authtypes.MustNewSubject(coretypes.NewResourceRole(), roleName, orgID, &coretypes.VerbAssignee)

	tuples := make([]*openfgav1.TupleKey, 0)
	for _, objectType := range provider.registry.Types() {
		typeTuples, err := provider.ReadTuples(ctx, &openfgav1.ReadRequestTupleKey{
			User:   subject,
			Object: objectType.StringValue() + ":",
		})
		if err != nil {
			return nil, err
		}
		tuples = append(tuples, typeTuples...)
	}

	return tuples, nil
}
