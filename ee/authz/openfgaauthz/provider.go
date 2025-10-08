package openfgaauthz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	pkgopenfgaauthz "github.com/SigNoz/signoz/pkg/authz/openfgaauthz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type provider struct {
	authz.AuthZ
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
		pkgAuthzService,
	}, nil
}

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgId valuer.UUID, relation authtypes.Relation, _ authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeUser, claims.UserID, authtypes.Relation{})
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selectors, orgId)
	if err != nil {
		return err
	}

	err = provider.AuthZ.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	return nil
}
