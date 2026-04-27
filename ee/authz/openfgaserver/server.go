package openfgaserver

import (
	"context"
	"strconv"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
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

func (server *Server) Healthy() <-chan struct{} {
	return server.pkgAuthzService.Healthy()
}

func (server *Server) Stop(ctx context.Context) error {
	return server.pkgAuthzService.Stop(ctx)
}

func (server *Server) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, relation authtypes.Relation, typeable coretypes.Resource, selectors []coretypes.Selector, _ []coretypes.Selector) error {
	subject := ""
	switch claims.Principal {
	case authtypes.PrincipalUser:
		user, err := authtypes.NewSubject(coretypes.NewResourceUser(), claims.UserID, orgID, nil)
		if err != nil {
			return err
		}

		subject = user
	case authtypes.PrincipalServiceAccount:
		serviceAccount, err := authtypes.NewSubject(coretypes.NewResourceServiceAccount(), claims.ServiceAccountID, orgID, nil)
		if err != nil {
			return err
		}

		subject = serviceAccount
	}

	tupleSlice := authtypes.NewTuples(typeable, subject, relation, selectors, orgID)

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

func (server *Server) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, relation authtypes.Relation, typeable coretypes.Resource, selectors []coretypes.Selector, _ []coretypes.Selector) error {
	subject, err := authtypes.NewSubject(coretypes.NewResourceAnonymous(), coretypes.AnonymousUser.String(), orgID, nil)
	if err != nil {
		return err
	}

	tupleSlice := authtypes.NewTuples(typeable, subject, relation, selectors, orgID)

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

func (server *Server) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, objectType coretypes.Type) ([]*coretypes.Object, error) {
	return server.pkgAuthzService.ListObjects(ctx, subject, relation, objectType)
}

func (server *Server) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	return server.pkgAuthzService.Write(ctx, additions, deletions)
}

func (server *Server) ReadTuples(ctx context.Context, tupleKey *openfgav1.ReadRequestTupleKey) ([]*openfgav1.TupleKey, error) {
	return server.pkgAuthzService.ReadTuples(ctx, tupleKey)
}
