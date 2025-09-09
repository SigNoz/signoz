package openfgaschema

import (
	"context"
	_ "embed"

	"github.com/SigNoz/signoz/pkg/authz"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
)

var (
	//go:embed base.fga
	baseDSL string
)

type schema struct{}

func NewSchema() authz.Schema {
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
