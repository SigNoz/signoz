package openfgaschema

import (
	"context"
	_ "embed"

	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

var (
	//go:embed base.fga
	baseDSL string
)

type Schema interface {
	Get(context.Context) []openfgapkgtransformer.ModuleFile
}

type schema struct{}

func NewSchema() Schema {
	return &schema{}
}

func (schema *schema) Get(ctx context.Context) []openfgapkgtransformer.ModuleFile {
	return []openfgapkgtransformer.ModuleFile{
		{
			Name:     "base.fga",
			Contents: baseDSL,
		},
	}
}
