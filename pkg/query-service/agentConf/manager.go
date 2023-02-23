package agentConf

import (
	"context"
	"fmt"
	"sync/atomic"

	tsp "github.com/SigNoz/signoz-otel-collector/processor/signoztailsamplingprocessor"
	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.uber.org/zap"
)

var m *Manager

func init() {
	m = &Manager{}
}

type Manager struct {
	Repo
	// lock to make sure only one update is sent to remote agents at a time
	lock uint32
}

// Ready indicates if Manager can accept new config update requests
func (mgr *Manager) Ready() bool {
	return mgr.lock == 0
}

func Initiate(db *sqlx.DB, engine string) error {
	m.Repo = Repo{db}
	return m.initDB(engine)
}

// Ready indicates if Manager can accept new config update requests
func Ready() bool {
	return m.Ready()
}

func GetLatestVersion(ctx context.Context, elementType ElementTypeDef) (*ConfigVersion, error) {
	return m.GetLatestVersion(ctx, elementType)
}

func GetConfigVersion(ctx context.Context, elementType ElementTypeDef, version int) (*ConfigVersion, error) {
	return m.GetConfigVersion(ctx, elementType, version)
}

func GetConfigHistory(ctx context.Context, typ ElementTypeDef) ([]ConfigVersion, error) {
	return m.GetConfigHistory(ctx, typ)
}

// StartNewVersion launches a new config version for given set of elements
func StartNewVersion(ctx context.Context, eleType ElementTypeDef, elementIds []string) (*ConfigVersion, error) {

	if !m.Ready() {
		// agent is already being updated, ask caller to wait and re-try after sometime
		return nil, fmt.Errorf("agent updater is busy")
	}

	// create a new version
	cfg := NewConfigversion(eleType)

	// insert new config and elements into database
	err := m.insertConfig(ctx, cfg, elementIds)
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

// OnConfigUpdate is a callback function passed to opamp server.
// It receives a config hash with error status.  We assume
// successful deployment if no error is received.
// this method is currently expected to be called only once in the lifecycle
// but can be improved in future to accept continuous request status updates from opamp
func (m *Manager) OnConfigUpdate(hash string, err error) {

	status := string(Deployed)
	message := "deploy successful"
	if err != nil {
		status = string(DeployFailed)
		message = err.Error()
	}

	m.updateDeployStatusByHash(context.Background(), hash, status, message)
}

// UpsertSamplingProcessor updates the agent config with new filter processor params
func UpsertSamplingProcessor(ctx context.Context, version int, key string, config *tsp.Config) error {
	if !atomic.CompareAndSwapUint32(&m.lock, 0, 1) {
		return fmt.Errorf("agent updater is busy")
	}
	defer atomic.StoreUint32(&m.lock, 0)

	// merge current config with new filter params
	processorConf := map[string]interface{}{
		"tail_sampling": config,
	}

	opamp.AddToTracePipeline("tail_sampling")
	configHash, err := opamp.UpsertTraceProcessors(ctx, []interface{}{processorConf}, m.OnConfigUpdate)
	if err != nil {
		zap.S().Errorf("failed to call agent config update for trace processor:", err)
		return err
	}
	m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash)
	return nil
}
