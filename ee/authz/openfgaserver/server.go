package openfgaserver

import (
	"context"
	"strconv"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
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

func (server *Server) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableUser, claims.UserID, orgID, nil)
	if err != nil {
		return err
	}

	tupleSlice, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	tuples := make(map[string]*openfgav1.TupleKey, len(tupleSlice))
	for idx, tuple := range tupleSlice {
		tuples[strconv.Itoa(idx)] = tuple
	}

	response, err := server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	for _, resp := range response {
		if resp.Authorized {
			return nil
		}
	}

	return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subjects are not authorized for requested access")
}

func (server *Server) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable authtypes.Typeable, selectors []authtypes.Selector, _ []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.String(), orgID, nil)
	if err != nil {
		return err
	}

	tupleSlice, err := typeable.Tuples(subject, relation, selectors, orgID)
	if err != nil {
		return err
	}

	tuples := make(map[string]*openfgav1.TupleKey, len(tupleSlice))
	for idx, tuple := range tupleSlice {
		tuples[strconv.Itoa(idx)] = tuple
	}

	response, err := server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	for _, resp := range response {
		if resp.Authorized {
			return nil
		}
	}

	return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subjects are not authorized for requested access")
}

func (server *Server) BatchCheck(ctx context.Context, tupleReq map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error) {
	return server.pkgAuthzService.BatchCheck(ctx, tupleReq)
}

func (server *Server) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	return server.pkgAuthzService.ListObjects(ctx, subject, relation, typeable)
}

func (server *Server) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return server.pkgAuthzService.Write(ctx, additions, deletions)
}
