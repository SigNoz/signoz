package authz

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service

	// Check returns error when the upstream authorization server is unavailable or the subject (s) doesn't have relation (r) on object (o).
	Check(context.Context, *openfgav1.CheckRequestTupleKey) error

	CheckWithTupleCreation(*http.Request, authtypes.Relation, authtypes.Typeable, authtypes.Selector, authtypes.Typeable, ...authtypes.Selector) error
}

type Selector interface {
	// GetSelectors returns the typeable selector and all the parent typeable selectors
	GetSelectors(req *http.Request) (authtypes.Selector, []authtypes.Selector, error)
}
