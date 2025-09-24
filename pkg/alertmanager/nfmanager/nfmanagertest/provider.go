package nfmanagertest

import (
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// MockNotificationManager is a simple mock implementation of NotificationManager
type MockNotificationManager struct {
	configs map[string]*alertmanagertypes.NotificationConfig
	errors  map[string]error
}

// NewMock creates a new mock notification manager
func NewMock() *MockNotificationManager {
	return &MockNotificationManager{
		configs: make(map[string]*alertmanagertypes.NotificationConfig),
		errors:  make(map[string]error),
	}
}

func getKey(orgId string, ruleId string) string {
	return orgId + ":" + ruleId
}

func (m *MockNotificationManager) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	key := getKey(orgID, ruleID)
	if err := m.errors[key]; err != nil {
		return nil, err
	}
	if config := m.configs[key]; config != nil {
		return config, nil
	}

	notificationConfig := alertmanagertypes.GetDefaultNotificationConfig()
	return &notificationConfig, nil
}

func (m *MockNotificationManager) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	key := getKey(orgID, ruleID)
	if err := m.errors[key]; err != nil {
		return err
	}
	m.configs[key] = config
	return nil
}

func (m *MockNotificationManager) DeleteNotificationConfig(orgID string, ruleID string) error {
	key := getKey(orgID, ruleID)
	if err := m.errors[key]; err != nil {
		return err
	}
	delete(m.configs, key)
	return nil
}

func (m *MockNotificationManager) SetMockConfig(orgID, ruleID string, config *alertmanagertypes.NotificationConfig) {
	key := getKey(orgID, ruleID)
	m.configs[key] = config
}

func (m *MockNotificationManager) SetMockError(orgID, ruleID string, err error) {
	key := getKey(orgID, ruleID)
	m.errors[key] = err
}

func (m *MockNotificationManager) ClearMockData() {
	m.configs = make(map[string]*alertmanagertypes.NotificationConfig)
	m.errors = make(map[string]error)
}

func (m *MockNotificationManager) HasConfig(orgID, ruleID string) bool {
	key := getKey(orgID, ruleID)
	_, exists := m.configs[key]
	return exists
}
