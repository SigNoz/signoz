package openfgaserver

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type Server struct {
	pkgAuthzService authz.AuthZ
}

func NewOpenfgaServer(ctx context.Context, pkgAuthzService authz.AuthZ) (*Server, error) {

	return &Server{
		pkgAuthzService: pkgAuthzService,
	}, nil
}

func (server *Server) Start(ctx context.Context) error {
	return server.pkgAuthzService.Start(ctx)
}

func (server *Server) Stop(ctx context.Context) error {
	return server.pkgAuthzService.Stop(ctx)
}

func (server *Server) Check(ctx context.Context, tuple *openfgav1.TupleKey) error {
	return server.pkgAuthzService.Check(ctx, tuple)
}

func (server *Server) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableUser, claims.UserID, orgID, nil)
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	err = server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	return nil
}

func (server *Server) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.String(), orgID, nil)
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	err = server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	return nil
}

func (server *Server) BatchCheck(ctx context.Context, tuples []*openfgav1.TupleKey) error {
	return server.pkgAuthzService.BatchCheck(ctx, tuples)
}

func (server *Server) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	return server.pkgAuthzService.ListObjects(ctx, subject, relation, typeable)
}

func (server *Server) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return server.pkgAuthzService.Write(ctx, additions, deletions)
}
