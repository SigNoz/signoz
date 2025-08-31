package schema

import (
	_ "embed"

	"github.com/openfga/language/pkg/go/transformer"
)

var (
	//go:embed core.fga
	coreDSL string
)

var SchemaModules = []transformer.ModuleFile{
	{
		Name:     "core.fga",
		Contents: coreDSL,
	},
}
