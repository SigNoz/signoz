package nfmanagertest

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/common/model"
)

// MockNotificationManager is a simple mock implementation of NotificationManager
type MockNotificationManager struct {
	configs      map[string]*alertmanagertypes.NotificationConfig
	routes       map[string]*alertmanagertypes.RoutePolicy
	routesByName map[string][]*alertmanagertypes.RoutePolicy
	errors       map[string]error
}

// NewMock creates a new mock notification manager
func NewMock() *MockNotificationManager {
	return &MockNotificationManager{
		configs:      make(map[string]*alertmanagertypes.NotificationConfig),
		routes:       make(map[string]*alertmanagertypes.RoutePolicy),
		routesByName: make(map[string][]*alertmanagertypes.RoutePolicy),
		errors:       make(map[string]error),
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
	m.routes = make(map[string]*alertmanagertypes.RoutePolicy)
	m.routesByName = make(map[string][]*alertmanagertypes.RoutePolicy)
	m.errors = make(map[string]error)
}

func (m *MockNotificationManager) HasConfig(orgID, ruleID string) bool {
	key := getKey(orgID, ruleID)
	_, exists := m.configs[key]
	return exists
}

// Route Policy CRUD

func (m *MockNotificationManager) CreateRoutePolicy(ctx context.Context, orgID string, route *alertmanagertypes.RoutePolicy) error {
	key := getKey(orgID, "create_route")
	if err := m.errors[key]; err != nil {
		return err
	}

	if route == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "route cannot be nil")
	}

	if err := route.Validate(); err != nil {
		return err
	}

	routeKey := getKey(orgID, route.ID.StringValue())
	m.routes[routeKey] = route
	nameKey := getKey(orgID, route.Name)
	m.routesByName[nameKey] = append(m.routesByName[nameKey], route)

	return nil
}

func (m *MockNotificationManager) CreateRoutePolicies(ctx context.Context, orgID string, routes []*alertmanagertypes.RoutePolicy) error {
	key := getKey(orgID, "create_routes")
	if err := m.errors[key]; err != nil {
		return err
	}

	if len(routes) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "routes cannot be empty")
	}
	for i, route := range routes {
		if route == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "route at index %d cannot be nil", i)
		}
		if err := route.Validate(); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "route at index %d", i)
		}
	}
	for _, route := range routes {
		if err := m.CreateRoutePolicy(ctx, orgID, route); err != nil {
			return err
		}
	}

	return nil
}

func (m *MockNotificationManager) GetRoutePolicyByID(ctx context.Context, orgID string, routeID string) (*alertmanagertypes.RoutePolicy, error) {
	key := getKey(orgID, "get_route")
	if err := m.errors[key]; err != nil {
		return nil, err
	}

	if routeID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	routeKey := getKey(orgID, routeID)
	route, exists := m.routes[routeKey]
	if !exists {
		return nil, errors.NewNotFoundf(errors.CodeNotFound, "route with ID %s not found", routeID)
	}

	return route, nil
}

func (m *MockNotificationManager) GetAllRoutePolicies(ctx context.Context, orgID string) ([]*alertmanagertypes.RoutePolicy, error) {
	key := getKey(orgID, "get_all_routes")
	if err := m.errors[key]; err != nil {
		return nil, err
	}

	if orgID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "orgID cannot be empty")
	}

	var routes []*alertmanagertypes.RoutePolicy
	for routeKey, route := range m.routes {
		if route.OrgID == orgID {
			routes = append(routes, route)
		}
		_ = routeKey
	}

	return routes, nil
}

func (m *MockNotificationManager) DeleteRoutePolicy(ctx context.Context, orgID string, routeID string) error {
	key := getKey(orgID, "delete_route")
	if err := m.errors[key]; err != nil {
		return err
	}

	if routeID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	routeKey := getKey(orgID, routeID)
	route, exists := m.routes[routeKey]
	if !exists {
		return errors.NewNotFoundf(errors.CodeNotFound, "route with ID %s not found", routeID)
	}
	delete(m.routes, routeKey)

	nameKey := getKey(orgID, route.Name)
	if nameRoutes, exists := m.routesByName[nameKey]; exists {
		var filtered []*alertmanagertypes.RoutePolicy
		for _, r := range nameRoutes {
			if r.ID.StringValue() != routeID {
				filtered = append(filtered, r)
			}
		}
		if len(filtered) == 0 {
			delete(m.routesByName, nameKey)
		} else {
			m.routesByName[nameKey] = filtered
		}
	}

	return nil
}

func (m *MockNotificationManager) DeleteAllRoutePoliciesByName(ctx context.Context, orgID string, name string) error {
	key := getKey(orgID, "delete_routes_by_name")
	if err := m.errors[key]; err != nil {
		return err
	}

	if orgID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "orgID cannot be empty")
	}

	if name == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "name cannot be empty")
	}

	nameKey := getKey(orgID, name)
	routes, exists := m.routesByName[nameKey]
	if !exists {
		return nil // No routes to delete
	}

	for _, route := range routes {
		routeKey := getKey(orgID, route.ID.StringValue())
		delete(m.routes, routeKey)
	}

	delete(m.routesByName, nameKey)

	return nil
}

func (m *MockNotificationManager) Match(ctx context.Context, orgID string, ruleID string, set model.LabelSet) ([]string, error) {
	key := getKey(orgID, ruleID)
	if err := m.errors[key]; err != nil {
		return nil, err
	}

	config, err := m.GetNotificationConfig(orgID, ruleID)
	if err != nil {
		return nil, err
	}

	var expressionRoutes []*alertmanagertypes.RoutePolicy
	if config.UsePolicy {
		for _, route := range m.routes {
			if route.OrgID == orgID && route.ExpressionKind == alertmanagertypes.PolicyBasedExpression {
				expressionRoutes = append(expressionRoutes, route)
			}
		}
	} else {
		nameKey := getKey(orgID, ruleID)
		if routes, exists := m.routesByName[nameKey]; exists {
			expressionRoutes = routes
		}
	}

	var matchedChannels []string
	for _, route := range expressionRoutes {
		if m.evaluateExpr(route.Expression, set) {
			matchedChannels = append(matchedChannels, route.Channels...)
		}
	}

	return matchedChannels, nil
}

func (m *MockNotificationManager) evaluateExpr(expression string, labelSet model.LabelSet) bool {
	ruleID, ok := labelSet["ruleId"]
	if !ok {
		return false
	}
	if strings.Contains(expression, `ruleId in ["ruleId-OtherAlert", "ruleId-TestingAlert"]`) {
		return ruleID == "ruleId-OtherAlert" || ruleID == "ruleId-TestingAlert"
	}
	if strings.Contains(expression, `ruleId in ["ruleId-HighLatency", "ruleId-HighErrorRate"]`) {
		return ruleID == "ruleId-HighLatency" || ruleID == "ruleId-HighErrorRate"
	}
	if strings.Contains(expression, `ruleId == "ruleId-HighLatency"`) {
		return ruleID == "ruleId-HighLatency"
	}

	return false
}

// Helper methods for testing

func (m *MockNotificationManager) SetMockRoute(orgID string, route *alertmanagertypes.RoutePolicy) {
	routeKey := getKey(orgID, route.ID.StringValue())
	m.routes[routeKey] = route

	nameKey := getKey(orgID, route.Name)
	m.routesByName[nameKey] = append(m.routesByName[nameKey], route)
}

func (m *MockNotificationManager) SetMockRouteError(orgID, operation string, err error) {
	key := getKey(orgID, operation)
	m.errors[key] = err
}

func (m *MockNotificationManager) ClearMockRoutes() {
	m.routes = make(map[string]*alertmanagertypes.RoutePolicy)
	m.routesByName = make(map[string][]*alertmanagertypes.RoutePolicy)
}

func (m *MockNotificationManager) GetRouteCount() int {
	return len(m.routes)
}

func (m *MockNotificationManager) HasRoute(orgID, routeID string) bool {
	routeKey := getKey(orgID, routeID)
	_, exists := m.routes[routeKey]
	return exists
}
