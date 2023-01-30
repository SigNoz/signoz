package agenConf

import (
	"context"
	"fmt"
	"sync/atomic"

	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor"
)

var m *Manager

func init() {
	m = &Manager{}
}

type Manager struct {
	repo *Repo
	// lock to make sure only one update is sent to remote agents at a time
	lock uint32
}

// Ready indicates if Manager can accept new config update requests
func (mgr *Manager) Ready() bool {
	return mgr.lock == 1
}

func Initiate(db *sqlx.DB, path string) error {
	m.repo = &Repo{db}
	return m.repo.InitDB(path)
}

// Ready indicates if Manager can accept new config update requests
func Ready() bool {
	return m.lock == 1
}

func GetLatestVersion(ctx context.Context, elementType ElementTypeDef) (*ConfigVersion, error) {
	return m.repo.GetLatestVersion(ctx, elementType)
}

func GetConfigVersion(ctx context.Context, elementType ElementTypeDef, version float32) (*ConfigVersion, error) {
	return m.repo.GetConfigVersion(ctx, elementType, version)
}

func GetConfigHistory(ctx context.Context, typ ElementTypeDef) ([]ConfigVersion, error) {
	return m.repo.GetConfigHistory(ctx, typ)
}

// StartNewVersion launches a new config version for given set of elements
func StartNewVersion(ctx context.Context, eleType ElementTypeDef, elementIds []string) (*ConfigVersion, error) {

	if !m.Ready() {
		// agent is already being updated, ask caller to wait and re-try after sometime
		return nil, fmt.Errorf("agent updater is busy")
	}

	// create a new version
	cfg := NewConfigversion(ElementTypeDropRules)

	// insert new config and elements into database
	err := m.repo.InsertConfig(ctx, cfg, elementIds)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

// UpsertFilterProcessor updates the agent config with new filter processor params
func UpsertFilterProcessor(key string, config *filterprocessor.Config) error {
	if !atomic.CompareAndSwapUint32(&m.lock, 0, 1) {
		return fmt.Errorf("agent updater is busy")
	}
	defer atomic.StoreUint32(&m.lock, 0)

	// merge current config with new filter params
	return nil
}
