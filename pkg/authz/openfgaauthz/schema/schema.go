package schema

import (
	_ "embed"

	"github.com/openfga/language/pkg/go/transformer"
)

var (
	//go:embed base.fga
	baseDSL string
)

var Modules = []transformer.ModuleFile{
	{
		Name:     "base.fga",
		Contents: baseDSL,
	},
}
