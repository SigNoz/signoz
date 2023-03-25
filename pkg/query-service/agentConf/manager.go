package agentConf

import (
	"context"
	"fmt"
	"sync/atomic"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	filterprocessor "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/filterprocessor"
	tsp "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/tailsampler"
	"go.uber.org/zap"
	yaml "gopkg.in/yaml.v3"
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

func GetLatestVersion(ctx context.Context, elementType ElementTypeDef) (*ConfigVersion, error) {
	return m.GetLatestVersion(ctx, elementType)
}

func GetConfigVersion(ctx context.Context, elementType ElementTypeDef, version int) (*ConfigVersion, error) {
	return m.GetConfigVersion(ctx, elementType, version)
}

func GetConfigHistory(ctx context.Context, typ ElementTypeDef, limit int) ([]ConfigVersion, error) {
	return m.GetConfigHistory(ctx, typ, limit)
}

// StartNewVersion launches a new config version for given set of elements
func StartNewVersion(ctx context.Context, userId string, eleType ElementTypeDef, elementIds []string) (*ConfigVersion, error) {

	if !m.Ready() {
		// agent is already being updated, ask caller to wait and re-try after sometime
		return nil, fmt.Errorf("agent updater is busy")
	}

	// create a new version
	cfg := NewConfigversion(eleType)

	// insert new config and elements into database
	err := m.insertConfig(ctx, userId, cfg, elementIds)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

func Redeploy(ctx context.Context, typ ElementTypeDef, version int) error {

	configVersion, err := GetConfigVersion(ctx, typ, version)
	if err != nil {
		zap.S().Debug("failed to fetch config version during redeploy", err)
		return fmt.Errorf("failed to fetch details of the config version")
	}

	if configVersion == nil || (configVersion != nil && configVersion.LastConf == "") {
		zap.S().Debug("config version has no conf yaml", configVersion)
		return fmt.Errorf("the config version can not be redeployed")
	}
	switch typ {
	case ElementTypeSamplingRules:
		var config *tsp.Config
		if err := yaml.Unmarshal([]byte(configVersion.LastConf), &config); err != nil {
			zap.S().Error("failed to read last conf correctly", err)
			return fmt.Errorf("failed to read the stored config correctly")
		}

		// merge current config with new filter params
		processorConf := map[string]interface{}{
			"signoz_tail_sampling": config,
		}

		opamp.AddToTracePipelineSpec("signoz_tail_sampling")
		configHash, err := opamp.UpsertControlProcessors(ctx, "traces", processorConf, m.OnConfigUpdate)
		if err != nil {
			zap.S().Error("failed to call agent config update for trace processor:", err)
			return fmt.Errorf("failed to deploy the config")
		}

		m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash, configVersion.LastConf)
	case ElementTypeDropRules:
		var filterConfig *filterprocessor.Config
		if err := yaml.Unmarshal([]byte(configVersion.LastConf), &filterConfig); err != nil {
			zap.S().Error("failed to read last conf correctly", err)
			return fmt.Errorf("failed to read the stored config correctly")
		}
		processorConf := map[string]interface{}{
			"filter": filterConfig,
		}

		opamp.AddToMetricsPipelineSpec("filter")
		configHash, err := opamp.UpsertControlProcessors(ctx, "metrics", processorConf, m.OnConfigUpdate)
		if err != nil {
			zap.S().Error("failed to call agent config update for trace processor:", err)
			return err
		}

		m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash, configVersion.LastConf)
	}

	return nil
}

// UpsertFilterProcessor updates the agent config with new filter processor params
func UpsertFilterProcessor(ctx context.Context, version int, config *filterprocessor.Config) error {
	if !atomic.CompareAndSwapUint32(&m.lock, 0, 1) {
		return fmt.Errorf("agent updater is busy")
	}
	defer atomic.StoreUint32(&m.lock, 0)

	// merge current config with new filter params
	// merge current config with new filter params
	processorConf := map[string]interface{}{
		"filter": config,
	}

	opamp.AddToMetricsPipelineSpec("filter")
	configHash, err := opamp.UpsertControlProcessors(ctx, "metrics", processorConf, m.OnConfigUpdate)
	if err != nil {
		zap.S().Error("failed to call agent config update for trace processor:", err)
		return err
	}

	processorConfYaml, err := yaml.Marshal(config)
	if err != nil {
		zap.S().Warnf("unexpected error while transforming processor config to yaml", err)
	}

	m.updateDeployStatus(ctx, ElementTypeDropRules, version, string(DeployInitiated), "Deployment started", configHash, string(processorConfYaml))
	return nil
}

// OnConfigUpdate is a callback function passed to opamp server.
// It receives a config hash with error status.  We assume
// successful deployment if no error is received.
// this method is currently expected to be called only once in the lifecycle
// but can be improved in future to accept continuous request status updates from opamp
func (m *Manager) OnConfigUpdate(agentId string, hash string, err error) {

	status := string(Deployed)

	message := "deploy successful"

	defer func() {
		zap.S().Info(status, zap.String("agentId", agentId), zap.String("agentResponse", message))
	}()

	if err != nil {
		status = string(DeployFailed)
		message = fmt.Sprintf("%s: %s", agentId, err.Error())
	}

	m.updateDeployStatusByHash(context.Background(), hash, status, message)
}

// UpsertSamplingProcessor updates the agent config with new filter processor params
func UpsertSamplingProcessor(ctx context.Context, version int, config *tsp.Config) error {
	if !atomic.CompareAndSwapUint32(&m.lock, 0, 1) {
		return fmt.Errorf("agent updater is busy")
	}
	defer atomic.StoreUint32(&m.lock, 0)

	// merge current config with new filter params
	processorConf := map[string]interface{}{
		"signoz_tail_sampling": config,
	}

	opamp.AddToTracePipelineSpec("signoz_tail_sampling")
	configHash, err := opamp.UpsertControlProcessors(ctx, "traces", processorConf, m.OnConfigUpdate)
	if err != nil {
		zap.S().Error("failed to call agent config update for trace processor:", err)
		return err
	}

	processorConfYaml, err := yaml.Marshal(config)
	if err != nil {
		zap.S().Warnf("unexpected error while transforming processor config to yaml", err)
	}

	m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash, string(processorConfYaml))
	return nil
}

// UpsertLogParsingProcessors updates the agent with log parsing processors
func UpsertLogParsingProcessor(ctx context.Context, version int, rawPipelineData []byte, config map[string]interface{}, names []string) error {
	if !atomic.CompareAndSwapUint32(&m.lock, 0, 1) {
		return fmt.Errorf("agent updater is busy")
	}
	defer atomic.StoreUint32(&m.lock, 0)

	// send the changes to opamp.
	configHash, err := opamp.UpsertLogsParsingProcessor(context.Background(), config, names, m.OnConfigUpdate)
	if err != nil {
		zap.S().Errorf("failed to call agent config update for log parsing processor:", err)
		return err
	}

	m.updateDeployStatus(ctx, ElementTypeLogPipelines, version, string(DeployInitiated), "Deployment started", configHash, string(rawPipelineData))
	return nil
}
