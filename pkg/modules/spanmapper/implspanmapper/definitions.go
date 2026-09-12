package implspanmapper

import (
	"embed"
	"io/fs"
	"path"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
)

const definitionsRoot = "fs/definitions"

//go:embed fs/definitions/*.json
var definitionFiles embed.FS

// NewSystemGroupRegistry parses every embedded definition. Definitions are
// build-time assets validated by a test, so a failure here means the binary
// shipped broken JSON.
func NewSystemGroupRegistry() (spantypes.SpanMapperGroupRegistry, error) {
	entries, err := fs.ReadDir(definitionFiles, definitionsRoot)
	if err != nil {
		return spantypes.SpanMapperGroupRegistry{}, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read span mapper group definitions")
	}

	definitions := make([]spantypes.SpanMapperGroupDefinition, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		file := path.Join(definitionsRoot, entry.Name())
		raw, err := definitionFiles.ReadFile(file)
		if err != nil {
			return spantypes.SpanMapperGroupRegistry{}, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read %s", file)
		}

		definition, err := spantypes.NewSpanMapperGroupDefinition(raw)
		if err != nil {
			return spantypes.SpanMapperGroupRegistry{}, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "couldn't parse %s", file)
		}
		definitions = append(definitions, definition)
	}

	return spantypes.NewSpanMapperGroupRegistry(definitions)
}
