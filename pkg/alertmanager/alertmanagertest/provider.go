package alertmanagertest

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	amConfig "github.com/prometheus/alertmanager/config"
)

// MockAlertmanager is a simple mock implementation of the Alertmanager interface
type MockAlertmanager struct {
	mu sync.RWMutex

	// Storage maps
	alerts             map[string][]alertmanagertypes.PostableAlert                      // orgID -> alerts
	channels           map[string]map[valuer.UUID]*alertmanagertypes.Channel             // orgID -> channelID -> channel
	configs            map[string]*alertmanagertypes.Config                             // orgID -> config
	notifications      map[string]*alertmanagertypes.NotificationConfig                // orgID:ruleID -> notification config
	notificationRoutes map[string]*alertmanagertypes.ExpressionRoute                   // routeID -> route
	inhibitRules       map[string][]amConfig.InhibitRule                               // orgID -> inhibit rules

	// Error injection maps
	errors map[string]error // method:orgID -> error

	// Service state
	started bool
	stopped bool
}

// NewMock creates a new mock alertmanager
func NewMock() *MockAlertmanager {
	return &MockAlertmanager{
		alerts:        make(map[string][]alertmanagertypes.PostableAlert),
		channels:      make(map[string]map[valuer.UUID]*alertmanagertypes.Channel),
		configs:       make(map[string]*alertmanagertypes.Config),
		notifications: make(map[string]*alertmanagertypes.NotificationConfig),
		errors:        make(map[string]error),
		started:       false,
		stopped:       false,
	}
}

func getKey(orgID string, ruleID string) string {
	return orgID + ":" + ruleID
}

func getMethodKey(method, orgID string) string {
	return method + ":" + orgID
}

// Start implements factory.Service
func (m *MockAlertmanager) Start(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("Start", "")]; err != nil {
		return err
	}

	m.started = true
	m.stopped = false
	return nil
}

// Stop implements factory.Service
func (m *MockAlertmanager) Stop(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("Stop", "")]; err != nil {
		return err
	}

	m.stopped = true
	m.started = false
	return nil
}

// GetAlerts implements Alertmanager interface
func (m *MockAlertmanager) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("GetAlerts", orgID)]; err != nil {
		return nil, err
	}

	// For simplicity, return empty alerts slice
	// In a real implementation, you would convert PostableAlerts to GettableAlerts
	return alertmanagertypes.DeprecatedGettableAlerts{}, nil
}

// PutAlerts implements Alertmanager interface
func (m *MockAlertmanager) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("PutAlerts", orgID)]; err != nil {
		return err
	}

	if m.alerts[orgID] == nil {
		m.alerts[orgID] = make([]alertmanagertypes.PostableAlert, 0)
	}
	// Convert PostableAlerts to []PostableAlert
	for _, alert := range alerts {
		m.alerts[orgID] = append(m.alerts[orgID], *alert)
	}
	return nil
}

// TestReceiver implements Alertmanager interface
func (m *MockAlertmanager) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("TestReceiver", orgID)]; err != nil {
		return err
	}

	// Mock implementation always succeeds
	return nil
}

// TestAlert implements Alertmanager interface
func (m *MockAlertmanager) TestAlert(ctx context.Context, orgID string, alert *alertmanagertypes.PostableAlert, receivers []string) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("TestAlert", orgID)]; err != nil {
		return err
	}

	// Mock implementation always succeeds
	return nil
}

// ListChannels implements Alertmanager interface
func (m *MockAlertmanager) ListChannels(ctx context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("ListChannels", orgID)]; err != nil {
		return nil, err
	}

	channels := make([]*alertmanagertypes.Channel, 0)
	if orgChannels := m.channels[orgID]; orgChannels != nil {
		for _, channel := range orgChannels {
			channels = append(channels, channel)
		}
	}
	return channels, nil
}

// ListAllChannels implements Alertmanager interface
func (m *MockAlertmanager) ListAllChannels(ctx context.Context) ([]*alertmanagertypes.Channel, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("ListAllChannels", "")]; err != nil {
		return nil, err
	}

	channels := make([]*alertmanagertypes.Channel, 0)
	for _, orgChannels := range m.channels {
		for _, channel := range orgChannels {
			channels = append(channels, channel)
		}
	}
	return channels, nil
}

// GetChannelByID implements Alertmanager interface
func (m *MockAlertmanager) GetChannelByID(ctx context.Context, orgID string, channelID valuer.UUID) (*alertmanagertypes.Channel, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("GetChannelByID", orgID)]; err != nil {
		return nil, err
	}

	if orgChannels := m.channels[orgID]; orgChannels != nil {
		if channel := orgChannels[channelID]; channel != nil {
			return channel, nil
		}
	}
	return nil, nil // Channel not found
}

// UpdateChannelByReceiverAndID implements Alertmanager interface
func (m *MockAlertmanager) UpdateChannelByReceiverAndID(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver, id valuer.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("UpdateChannelByReceiverAndID", orgID)]; err != nil {
		return err
	}

	if m.channels[orgID] == nil {
		m.channels[orgID] = make(map[valuer.UUID]*alertmanagertypes.Channel)
	}

	if channel := m.channels[orgID][id]; channel != nil {
		// Update the existing channel with receiver data
		channel.Name = receiver.Name
		// In a real implementation, you would update other fields from receiver
	}

	return nil
}

// CreateChannel implements Alertmanager interface
func (m *MockAlertmanager) CreateChannel(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("CreateChannel", orgID)]; err != nil {
		return err
	}

	if m.channels[orgID] == nil {
		m.channels[orgID] = make(map[valuer.UUID]*alertmanagertypes.Channel)
	}

	// Create a new channel from receiver
	channel := alertmanagertypes.NewChannelFromReceiver(receiver, orgID)
	m.channels[orgID][channel.ID] = channel

	return nil
}

// DeleteChannelByID implements Alertmanager interface
func (m *MockAlertmanager) DeleteChannelByID(ctx context.Context, orgID string, channelID valuer.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("DeleteChannelByID", orgID)]; err != nil {
		return err
	}

	if orgChannels := m.channels[orgID]; orgChannels != nil {
		delete(orgChannels, channelID)
	}

	return nil
}

// SetConfig implements Alertmanager interface
func (m *MockAlertmanager) SetConfig(ctx context.Context, config *alertmanagertypes.Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	orgID := config.StoreableConfig().OrgID
	if err := m.errors[getMethodKey("SetConfig", orgID)]; err != nil {
		return err
	}

	m.configs[orgID] = config
	return nil
}

// GetConfig implements Alertmanager interface
func (m *MockAlertmanager) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("GetConfig", orgID)]; err != nil {
		return nil, err
	}

	if config := m.configs[orgID]; config != nil {
		return config, nil
	}

	// Return nil if no config found
	return nil, nil
}

// SetDefaultConfig implements Alertmanager interface
func (m *MockAlertmanager) SetDefaultConfig(ctx context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("SetDefaultConfig", orgID)]; err != nil {
		return err
	}

	// Create a basic default config using NewDefaultConfig
	defaultConfig, err := alertmanagertypes.NewDefaultConfig(
		alertmanagertypes.GlobalConfig{},
		alertmanagertypes.RouteConfig{},
		orgID,
	)
	if err != nil {
		return err
	}
	m.configs[orgID] = defaultConfig
	return nil
}

// SetNotificationConfig implements Alertmanager interface
func (m *MockAlertmanager) SetNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("SetNotificationConfig", orgID.String())]; err != nil {
		return err
	}

	key := getKey(orgID.String(), ruleID)
	m.notifications[key] = config
	return nil
}

// DeleteNotificationConfig implements Alertmanager interface
func (m *MockAlertmanager) DeleteNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := m.errors[getMethodKey("DeleteNotificationConfig", orgID.String())]; err != nil {
		return err
	}

	key := getKey(orgID.String(), ruleID)
	delete(m.notifications, key)
	return nil
}

// Collect implements statsreporter.StatsCollector interface
func (m *MockAlertmanager) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if err := m.errors[getMethodKey("Collect", orgID.String())]; err != nil {
		return nil, err
	}

	stats := make(map[string]any)

	// Count channels for this org
	if orgChannels := m.channels[orgID.String()]; orgChannels != nil {
		stats["channels"] = len(orgChannels)
	} else {
		stats["channels"] = 0
	}

	// Count alerts for this org
	if orgAlerts := m.alerts[orgID.String()]; orgAlerts != nil {
		stats["alerts"] = len(orgAlerts)
	} else {
		stats["alerts"] = 0
	}

	// Check if config exists
	if config := m.configs[orgID.String()]; config != nil {
		stats["has_config"] = true
	} else {
		stats["has_config"] = false
	}

	return stats, nil
}

// Mock helper methods for testing

// SetMockError sets an error to be returned by a specific method for a specific orgID
func (m *MockAlertmanager) SetMockError(method, orgID string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.errors[getMethodKey(method, orgID)] = err
}

// SetMockChannel sets a mock channel for testing
func (m *MockAlertmanager) SetMockChannel(orgID string, channel *alertmanagertypes.Channel) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.channels[orgID] == nil {
		m.channels[orgID] = make(map[valuer.UUID]*alertmanagertypes.Channel)
	}
	m.channels[orgID][channel.ID] = channel
}

// SetMockConfig sets a mock config for testing
func (m *MockAlertmanager) SetMockConfig(orgID string, config *alertmanagertypes.Config) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.configs[orgID] = config
}

// SetMockNotificationConfig sets a mock notification config for testing
func (m *MockAlertmanager) SetMockNotificationConfig(orgID, ruleID string, config *alertmanagertypes.NotificationConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := getKey(orgID, ruleID)
	m.notifications[key] = config
}

// SetMockAlerts sets mock alerts for testing
func (m *MockAlertmanager) SetMockAlerts(orgID string, alerts []alertmanagertypes.PostableAlert) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.alerts[orgID] = alerts
}

// ClearMockData clears all mock data
func (m *MockAlertmanager) ClearMockData() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.alerts = make(map[string][]alertmanagertypes.PostableAlert)
	m.channels = make(map[string]map[valuer.UUID]*alertmanagertypes.Channel)
	m.configs = make(map[string]*alertmanagertypes.Config)
	m.notifications = make(map[string]*alertmanagertypes.NotificationConfig)
	m.errors = make(map[string]error)
	m.started = false
	m.stopped = false
}

// Testing helper methods to check state

// HasChannel checks if a channel exists for the given org and ID
func (m *MockAlertmanager) HasChannel(orgID string, channelID valuer.UUID) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if orgChannels := m.channels[orgID]; orgChannels != nil {
		_, exists := orgChannels[channelID]
		return exists
	}
	return false
}

// HasConfig checks if a config exists for the given org
func (m *MockAlertmanager) HasConfig(orgID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, exists := m.configs[orgID]
	return exists
}

// HasNotificationConfig checks if a notification config exists for the given org and rule
func (m *MockAlertmanager) HasNotificationConfig(orgID, ruleID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	key := getKey(orgID, ruleID)
	_, exists := m.notifications[key]
	return exists
}

// GetAlertCount returns the number of alerts for the given org
func (m *MockAlertmanager) GetAlertCount(orgID string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if alerts := m.alerts[orgID]; alerts != nil {
		return len(alerts)
	}
	return 0
}

// GetChannelCount returns the number of channels for the given org
func (m *MockAlertmanager) GetChannelCount(orgID string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if channels := m.channels[orgID]; channels != nil {
		return len(channels)
	}
	return 0
}

// IsStarted returns whether the service is started
func (m *MockAlertmanager) IsStarted() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.started
}

// IsStopped returns whether the service is stopped
func (m *MockAlertmanager) IsStopped() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.stopped
}