package authz

import (
	"context"

	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

type Schema interface {
	Get(context.Context) []openfgapkgtransformer.ModuleFile
}
