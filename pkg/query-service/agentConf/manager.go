package agentConf

import (
	"context"
	"fmt"
	"sync/atomic"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.signoz.io/signoz/pkg/query-service/model"
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
	if atomic.LoadUint32(&mgr.lock) != 0 {
		return false
	}
	return opamp.Ready()
}

func Initiate(db *sqlx.DB, engine string) error {
	m.Repo = Repo{db}
	return m.initDB(engine)
}

// Ready indicates if Manager can accept new config update requests
func Ready() bool {
	return m.Ready()
}

func GetLatestVersion(
	ctx context.Context, elementType PreprocessingFeatureType,
) (*ConfigVersion, *model.ApiError) {
	return m.GetLatestVersion(ctx, elementType)
}

func GetConfigVersion(
	ctx context.Context, elementType PreprocessingFeatureType, version int,
) (*ConfigVersion, *model.ApiError) {
	return m.GetConfigVersion(ctx, elementType, version)
}

func GetConfigHistory(
	ctx context.Context, typ PreprocessingFeatureType, limit int,
) ([]ConfigVersion, *model.ApiError) {
	return m.GetConfigHistory(ctx, typ, limit)
}

// StartNewVersion launches a new config version for given set of elements
func StartNewVersion(
	ctx context.Context, userId string, eleType PreprocessingFeatureType, elementIds []string,
) (*ConfigVersion, *model.ApiError) {

	if !m.Ready() {
		// agent is already being updated, ask caller to wait and re-try after sometime
		return nil, model.UnavailableError(fmt.Errorf("agent updater is busy"))
	}

	// create a new version
	cfg := NewConfigversion(eleType)

	// insert new config and elements into database
	err := m.insertConfig(ctx, userId, cfg, elementIds)
	if err != nil {
		return nil, err
	}

	// TODO(Raj): Maybe this should be its own goroutine.
	NotifyCollectorConfSubscribers()

	return cfg, nil
}

// OnConfigUpdate is a callback function passed to opamp server.
// It receives a config hash with error status.  We assume
// successful deployment if no error is received.
// this method is currently expected to be called only once in the lifecycle
// but can be improved in future to accept continuous request status updates from opamp
func (m *Manager) OnConfigUpdate(agentId string, hash string, err error) {

	status := string(Deployed)

	message := "Deployment was successful"

	defer func() {
		zap.S().Info(status, zap.String("agentId", agentId), zap.String("agentResponse", message))
	}()

	if err != nil {
		status = string(DeployFailed)
		message = fmt.Sprintf("%s: %s", agentId, err.Error())
	}

	m.updateDeployStatusByHash(context.Background(), hash, status, message)
}
