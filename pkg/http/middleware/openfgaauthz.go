package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authztypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	openfgaAuthzDeniedMessage string = "::OPENFGA-AUTHZ-DENIED::"
)

type OpenfgaAuthZ struct {
	authzService authz.AuthZ
	logger       *slog.Logger
}

func NewOpenfgaAuthZ(authzService authz.AuthZ, logger *slog.Logger) *OpenfgaAuthZ {
	if logger == nil {
		panic("cannot build openfgaauthz middleware, logger is empty")
	}
	return &OpenfgaAuthZ{authzService: authzService, logger: logger}
}

// each individual APIs should be responsible for defining the relation and the object being accessed, subject will be derived from the request
func (middleware *OpenfgaAuthZ) Check(next http.HandlerFunc, relation authztypes.Relation) http.HandlerFunc {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		comment := ctxtypes.CommentFromContext(req.Context()).Map()
		subject, err := authztypes.NewSubject(comment)
		if err != nil {
			render.Error(rw, err)
			return
		}

		orgID, ok := comment["org_id"]
		if !ok {
			render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "org_id is missing from comment context"))
			return
		}
		object := authztypes.NewOrganization(valuer.MustNewUUID(orgID))

		checkRequestTupleKey := authztypes.GenerateOpenfgaTuple(subject, relation, object.StringValue())
		allow, err := middleware.authzService.Check(req.Context(), checkRequestTupleKey)
		if err != nil {
			render.Error(rw, err)
			return
		}

		if !allow {
			middleware.logger.WarnContext(req.Context(), openfgaAuthzDeniedMessage, "tuple", checkRequestTupleKey)
			render.Error(rw, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "subject %s cannot %s resource %s", subject, relation.StringValue(), object.StringValue()))
			return
		}

		next(rw, req)
	})
}
