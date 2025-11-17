package openfgaauthz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	pkgopenfgaauthz "github.com/SigNoz/signoz/pkg/authz/openfgaauthz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type provider struct {
	pkgAuthzService authz.AuthZ
}

func NewProviderFactory(sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstore, openfgaSchema)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) (authz.AuthZ, error) {
	pkgOpenfgaAuthzProvider := pkgopenfgaauthz.NewProviderFactory(sqlstore, openfgaSchema)
	pkgAuthzService, err := pkgOpenfgaAuthzProvider.New(ctx, settings, config)
	if err != nil {
		return nil, err
	}

	return &provider{
		pkgAuthzService: pkgAuthzService,
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

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, _ authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector) error {
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

func (provider *provider) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, _ authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector) error {
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
