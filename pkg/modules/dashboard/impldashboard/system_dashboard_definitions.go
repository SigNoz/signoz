package impldashboard

import (
	"embed"
	"io/fs"
	"path"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

const definitionsRoot = "fs/definitions"

//go:embed fs/definitions/*.json
var definitionFiles embed.FS

// NewSystemDashboardRegistry parses every embedded definition. Definitions are
// build-time assets validated by a test, so a failure here means the binary
// shipped broken JSON.
func NewSystemDashboardRegistry() (dashboardtypes.SystemDashboardRegistry, error) {
	entries, err := fs.ReadDir(definitionFiles, definitionsRoot)
	if err != nil {
		return dashboardtypes.SystemDashboardRegistry{}, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read system dashboard definitions")
	}

	definitions := make([]dashboardtypes.SystemDashboardDefinition, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		file := path.Join(definitionsRoot, entry.Name())
		raw, err := definitionFiles.ReadFile(file)
		if err != nil {
			return dashboardtypes.SystemDashboardRegistry{}, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read %s", file)
		}

		definition, err := dashboardtypes.NewSystemDashboardDefinition(raw)
		if err != nil {
			return dashboardtypes.SystemDashboardRegistry{}, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "couldn't parse %s", file)
		}
		definitions = append(definitions, definition)
	}

	return dashboardtypes.NewSystemDashboardRegistry(definitions)
}
