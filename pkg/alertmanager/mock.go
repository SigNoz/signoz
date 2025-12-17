package alertmanager

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	amConfig "github.com/prometheus/alertmanager/config"
)

type storedConfigItem struct {
	orgID  valuer.UUID
	ruleID string
	cfg    *alertmanagertypes.NotificationConfig
}

// MockAlertManager is a simple mock implementation of Alertmanager
// It is used to test the alertmanager functionality without the need to start an actual alertmanager
// It exposed some additional attributes that help verify the functionality of the alertmanager
type MockAlertManager struct {
	// Configs is a list of configs that have been set on the alertmanager
	// this can be used to verify that the correct config has been set on the alertmanager
	Configs []storedConfigItem
	// TriggeredTestAlerts is a list of test alerts that have been sent to the alertmanager
	// this can be used to verify that the correct alerts have been sent to the alertmanager
	TriggeredTestAlerts []map[*alertmanagertypes.PostableAlert][]string
}

// NewMockAlertManager creates a new mock alertmanager
func NewMockAlertManager() *MockAlertManager {
	return &MockAlertManager{
		Configs:             make([]storedConfigItem, 0),
		TriggeredTestAlerts: make([]map[*alertmanagertypes.PostableAlert][]string, 0),
	}
}

func (f *MockAlertManager) GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	return alertmanagertypes.DeprecatedGettableAlerts{}, nil
}
func (f *MockAlertManager) PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error {
	return nil
}
func (f *MockAlertManager) TestReceiver(context.Context, string, alertmanagertypes.Receiver) error {
	return nil
}
func (f *MockAlertManager) TestAlert(ctx context.Context, orgID string, ruleID string, receiverMap map[*alertmanagertypes.PostableAlert][]string) error {
	f.TriggeredTestAlerts = append(f.TriggeredTestAlerts, receiverMap)
	return nil
}
func (f *MockAlertManager) ListChannels(context.Context, string) ([]*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *MockAlertManager) ListAllChannels(context.Context) ([]*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *MockAlertManager) GetChannelByID(context.Context, string, valuer.UUID) (*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *MockAlertManager) UpdateChannelByReceiverAndID(context.Context, string, alertmanagertypes.Receiver, valuer.UUID) error {
	return nil
}
func (f *MockAlertManager) CreateChannel(context.Context, string, alertmanagertypes.Receiver) error {
	return nil
}
func (f *MockAlertManager) DeleteChannelByID(context.Context, string, valuer.UUID) error { return nil }
func (f *MockAlertManager) SetConfig(context.Context, *alertmanagertypes.Config) error   { return nil }
func (f *MockAlertManager) GetConfig(context.Context, string) (*alertmanagertypes.Config, error) {
	return nil, nil
}
func (f *MockAlertManager) SetDefaultConfig(context.Context, string) error { return nil }
func (f *MockAlertManager) SetNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleId string, cfg *alertmanagertypes.NotificationConfig) error {
	f.Configs = append(f.Configs, storedConfigItem{orgID: orgID, ruleID: ruleId, cfg: cfg})
	return nil
}
func (f *MockAlertManager) DeleteNotificationConfig(context.Context, valuer.UUID, string) error {
	return nil
}
func (f *MockAlertManager) CreateRoutePolicy(context.Context, *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *MockAlertManager) CreateRoutePolicies(context.Context, []*alertmanagertypes.PostableRoutePolicy) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *MockAlertManager) GetRoutePolicyByID(context.Context, string) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *MockAlertManager) GetAllRoutePolicies(context.Context) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *MockAlertManager) UpdateRoutePolicyByID(context.Context, string, *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *MockAlertManager) DeleteRoutePolicyByID(context.Context, string) error { return nil }
func (f *MockAlertManager) DeleteAllRoutePoliciesByRuleId(context.Context, string) error {
	return nil
}
func (f *MockAlertManager) UpdateAllRoutePoliciesByRuleId(context.Context, string, []*alertmanagertypes.PostableRoutePolicy) error {
	return nil
}
func (f *MockAlertManager) CreateInhibitRules(context.Context, valuer.UUID, []amConfig.InhibitRule) error {
	return nil
}
func (f *MockAlertManager) DeleteAllInhibitRulesByRuleId(context.Context, valuer.UUID, string) error {
	return nil
}
func (f *MockAlertManager) Shutdown(context.Context) error { return nil }
func (f *MockAlertManager) Stats() map[string]interface{}  { return map[string]interface{}{} }
func (f *MockAlertManager) CreateRoute(context.Context, valuer.UUID, *alertmanagertypes.PostableRoutePolicy) error {
	return nil
}
func (f *MockAlertManager) DeleteRoute(context.Context, valuer.UUID, string) error { return nil }

func (f *MockAlertManager) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, nil
}

func (f *MockAlertManager) Start(context.Context) error {
	return nil
}
func (f *MockAlertManager) Stop(context.Context) error {
	return nil
}
