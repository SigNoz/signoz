package openfgaserver

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	pkgopenfgaserver "github.com/SigNoz/signoz/pkg/authz/openfgaserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type Server struct {
	pkgOpenfgaServer *pkgopenfgaserver.Server
	registry         []authz.RegisterTypeable
}

func NewOpenfgaServer(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) (*Server, error) {
	pkgOpenfgaServer, err := pkgopenfgaserver.NewOpenfgaServer(ctx, settings, config, sqlstore, openfgaSchema)
	if err != nil {
		return nil, err
	}

	return &Server{
		pkgOpenfgaServer: pkgOpenfgaServer,
	}, nil
}

func (provider *Server) Start(ctx context.Context) error {
	return provider.pkgOpenfgaServer.Start(ctx)
}

func (provider *Server) Stop(ctx context.Context) error {
	return provider.pkgOpenfgaServer.Stop(ctx)
}

func (provider *Server) Check(ctx context.Context, tuple *openfgav1.TupleKey) error {
	return provider.pkgOpenfgaServer.Check(ctx, tuple)
}

func (provider *Server) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
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

func (provider *Server) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
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

func (provider *Server) BatchCheck(ctx context.Context, tuples []*openfgav1.TupleKey) error {
	return provider.pkgOpenfgaServer.BatchCheck(ctx, tuples)
}

func (provider *Server) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	return provider.pkgOpenfgaServer.ListObjects(ctx, subject, relation, typeable)
}

func (provider *Server) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return provider.pkgOpenfgaServer.Write(ctx, additions, deletions)
}
