package agentConf

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	filterprocessor "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/filterprocessor"
	tsp "go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/tailsampler"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
	yaml "gopkg.in/yaml.v3"
)

var m *Manager

func init() {
	m = &Manager{}
}

type AgentFeatureType string

type Manager struct {
	Repo
	// lock to make sure only one update is sent to remote agents at a time
	lock uint32

	// For AgentConfigProvider implementation
	agentFeatures         []AgentFeature
	configSubscribers     map[string]func()
	configSubscribersLock sync.Mutex
}

type ManagerOptions struct {
	DB *sqlx.DB

	// When acting as opamp.AgentConfigProvider, agent conf recommendations are
	// applied to the base conf in the order the features have been specified here.
	AgentFeatures []AgentFeature
}

func Initiate(options *ManagerOptions) (*Manager, error) {
	// featureType must be unqiue across registered AgentFeatures.
	agentFeatureByType := map[AgentFeatureType]AgentFeature{}
	for _, feature := range options.AgentFeatures {
		featureType := feature.AgentFeatureType()
		if agentFeatureByType[featureType] != nil {
			panic(fmt.Sprintf(
				"found multiple agent features with type: %s", featureType,
			))
		}
		agentFeatureByType[featureType] = feature
	}

	m = &Manager{
		Repo:              Repo{options.DB},
		agentFeatures:     options.AgentFeatures,
		configSubscribers: map[string]func(){},
	}

	return m, nil
}

// Implements opamp.AgentConfigProvider
func (m *Manager) SubscribeToConfigUpdates(callback func()) (unsubscribe func()) {
	m.configSubscribersLock.Lock()
	defer m.configSubscribersLock.Unlock()

	subscriberId := uuid.NewString()
	m.configSubscribers[subscriberId] = callback

	return func() {
		delete(m.configSubscribers, subscriberId)
	}
}

func (m *Manager) notifyConfigUpdateSubscribers() {
	m.configSubscribersLock.Lock()
	defer m.configSubscribersLock.Unlock()
	for _, handler := range m.configSubscribers {
		handler()
	}
}

// Implements opamp.AgentConfigProvider
func (m *Manager) RecommendAgentConfig(currentConfYaml []byte) (
	recommendedConfYaml []byte,
	// Opaque id of the recommended config, used for reporting deployment status updates
	configId string,
	err error,
) {
	recommendation := currentConfYaml
	settingVersionsUsed := []string{}

	for _, feature := range m.agentFeatures {
		featureType := ElementTypeDef(feature.AgentFeatureType())
		latestConfig, apiErr := GetLatestVersion(context.Background(), featureType)
		if apiErr != nil && apiErr.Type() != model.ErrorNotFound {
			return nil, "", errors.Wrap(apiErr.ToError(), "failed to get latest agent config version")
		}

		updatedConf, serializedSettingsUsed, apiErr := feature.RecommendAgentConfig(
			recommendation, latestConfig,
		)
		if apiErr != nil {
			return nil, "", errors.Wrap(apiErr.ToError(), fmt.Sprintf(
				"failed to generate agent config recommendation for %s", featureType,
			))
		}
		recommendation = updatedConf

		// It is possible for a feature to recommend collector config
		// before any user created config versions exist.
		//
		// For example, log pipeline config for installed integrations will
		// have to be recommended even if the user hasn't created any pipelines yet
		configVersion := -1
		if latestConfig != nil {
			configVersion = latestConfig.Version
		}
		configId := fmt.Sprintf("%s:%d", featureType, configVersion)

		settingVersionsUsed = append(settingVersionsUsed, configId)

		m.updateDeployStatus(
			context.Background(),
			featureType,
			configVersion,
			string(DeployInitiated),
			"Deployment has started",
			configId,
			serializedSettingsUsed,
		)

	}

	if len(settingVersionsUsed) > 0 {
		configId = strings.Join(settingVersionsUsed, ",")

	} else {
		// Do not return an empty configId even if no recommendations were made
		hash := sha256.New()
		hash.Write(recommendation)
		configId = string(hash.Sum(nil))
	}

	return recommendation, configId, nil
}

// Implements opamp.AgentConfigProvider
func (m *Manager) ReportConfigDeploymentStatus(
	agentId string,
	configId string,
	err error,
) {
	featureConfigIds := strings.Split(configId, ",")
	for _, featureConfId := range featureConfigIds {
		newStatus := string(Deployed)
		message := "Deployment was successful"
		if err != nil {
			newStatus = string(DeployFailed)
			message = fmt.Sprintf("%s: %s", agentId, err.Error())
		}
		m.updateDeployStatusByHash(
			context.Background(), featureConfId, newStatus, message,
		)
	}
}

func GetLatestVersion(
	ctx context.Context, elementType ElementTypeDef,
) (*ConfigVersion, *model.ApiError) {
	return m.GetLatestVersion(ctx, elementType)
}

func GetConfigVersion(
	ctx context.Context, elementType ElementTypeDef, version int,
) (*ConfigVersion, *model.ApiError) {
	return m.GetConfigVersion(ctx, elementType, version)
}

func GetConfigHistory(
	ctx context.Context, typ ElementTypeDef, limit int,
) ([]ConfigVersion, *model.ApiError) {
	return m.GetConfigHistory(ctx, typ, limit)
}

// StartNewVersion launches a new config version for given set of elements
func StartNewVersion(
	ctx context.Context, userId string, eleType ElementTypeDef, elementIds []string,
) (*ConfigVersion, *model.ApiError) {

	// create a new version
	cfg := NewConfigVersion(eleType)

	// insert new config and elements into database
	err := m.insertConfig(ctx, userId, cfg, elementIds)
	if err != nil {
		return nil, err
	}

	m.notifyConfigUpdateSubscribers()

	return cfg, nil
}

func NotifyConfigUpdate(ctx context.Context) {
	m.notifyConfigUpdateSubscribers()
}

func Redeploy(ctx context.Context, typ ElementTypeDef, version int) *model.ApiError {

	configVersion, err := GetConfigVersion(ctx, typ, version)
	if err != nil {
		zap.L().Error("failed to fetch config version during redeploy", zap.Error(err))
		return model.WrapApiError(err, "failed to fetch details of the config version")
	}

	if configVersion == nil || (configVersion != nil && configVersion.LastConf == "") {
		zap.L().Debug("config version has no conf yaml", zap.Any("configVersion", configVersion))
		return model.BadRequest(fmt.Errorf("the config version can not be redeployed"))
	}
	switch typ {
	case ElementTypeSamplingRules:
		var config *tsp.Config
		if err := yaml.Unmarshal([]byte(configVersion.LastConf), &config); err != nil {
			zap.L().Debug("failed to read last conf correctly", zap.Error(err))
			return model.BadRequest(fmt.Errorf("failed to read the stored config correctly"))
		}

		// merge current config with new filter params
		processorConf := map[string]interface{}{
			"signoz_tail_sampling": config,
		}

		opamp.AddToTracePipelineSpec("signoz_tail_sampling")
		configHash, err := opamp.UpsertControlProcessors(ctx, "traces", processorConf, m.OnConfigUpdate)
		if err != nil {
			zap.L().Error("failed to call agent config update for trace processor", zap.Error(err))
			return model.InternalError(fmt.Errorf("failed to deploy the config"))
		}

		m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash, configVersion.LastConf)
	case ElementTypeDropRules:
		var filterConfig *filterprocessor.Config
		if err := yaml.Unmarshal([]byte(configVersion.LastConf), &filterConfig); err != nil {
			zap.L().Error("failed to read last conf correctly", zap.Error(err))
			return model.InternalError(fmt.Errorf("failed to read the stored config correctly"))
		}
		processorConf := map[string]interface{}{
			"filter": filterConfig,
		}

		opamp.AddToMetricsPipelineSpec("filter")
		configHash, err := opamp.UpsertControlProcessors(ctx, "metrics", processorConf, m.OnConfigUpdate)
		if err != nil {
			zap.L().Error("failed to call agent config update for trace processor", zap.Error(err))
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
		zap.L().Error("failed to call agent config update for trace processor", zap.Error(err))
		return err
	}

	processorConfYaml, yamlErr := yaml.Marshal(config)
	if yamlErr != nil {
		zap.L().Warn("unexpected error while transforming processor config to yaml", zap.Error(yamlErr))
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

	message := "Deployment was successful"

	defer func() {
		zap.L().Info(status, zap.String("agentId", agentId), zap.String("agentResponse", message))
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
		zap.L().Error("failed to call agent config update for trace processor", zap.Error(err))
		return err
	}

	processorConfYaml, yamlErr := yaml.Marshal(config)
	if yamlErr != nil {
		zap.L().Warn("unexpected error while transforming processor config to yaml", zap.Error(yamlErr))
	}

	m.updateDeployStatus(ctx, ElementTypeSamplingRules, version, string(DeployInitiated), "Deployment started", configHash, string(processorConfYaml))
	return nil
}
