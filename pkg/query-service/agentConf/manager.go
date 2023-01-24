package agenConf

import (
	"context"
	"sync"

	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor"
)

var Updater *Manager

func init() {
	Updater = &VersionMan{}
}

type Manager struct {
	repo *Repo
	// lock to make sure only one update is sent to remote agents at a time
	m sync.Mutex
}

func (m Manager) Available() bool {
	// check lock and respond
	return false
}

func (m *Manager) StartNewVersion(ctx context.Context, eleType ElementTypeDef, elements []Element) (*ConfigVersion, error) {
	// create a new version
	cfg := NewConfigversion(ElementTypeDropRules)

	var elementIds []string

	// write to config version and elements to table
	for _, e := range elements {
		elementId := e.ID()
		if elementId != "" {
			elementIds = append(elementIds, elementId)
		}
	}

	// insert new config into database
	err := m.repo.InsertConfig(ctx, cfg, elementIds)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

// UpsertFilterProcessor updates the agent config with new filter processor params
func (m *Manager) UpsertFilterProcessor(key string, config *filterprocessor.Config) error {
	return nil
}
