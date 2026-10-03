package rules

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type configConflictRuleStore struct {
	ruletypes.RuleStore
	rule          ruletypes.StorableRule
	callbackCalls int
}

func (s *configConflictRuleStore) GetStoredRule(context.Context, valuer.UUID, valuer.UUID) (*ruletypes.StorableRule, error) {
	rule := s.rule
	return &rule, nil
}

func (s *configConflictRuleStore) CreateRule(ctx context.Context, _ *ruletypes.StorableRule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	s.callbackCalls++
	return s.rule.ID, cb(ctx, s.rule.ID)
}

func (s *configConflictRuleStore) EditRule(ctx context.Context, _ *ruletypes.StorableRule, cb func(context.Context) error) error {
	s.callbackCalls++
	return cb(ctx)
}

func (s *configConflictRuleStore) DeleteRule(ctx context.Context, _, _ valuer.UUID, cb func(context.Context) error) error {
	s.callbackCalls++
	return cb(ctx)
}

type configConflictTask struct {
	Task
	stopped bool
}

func (t *configConflictTask) Stop() {
	t.stopped = true
}

func TestManagerConfigConflictPreservesNotificationsAndTasks(t *testing.T) {
	orgID := valuer.MustNewUUID("01900000-0000-7000-8000-000000000001")
	ruleID := valuer.MustNewUUID("01900000-0000-7000-8000-000000000002")
	ctx := authtypes.NewContextWithClaims(context.Background(), authtypes.Claims{
		OrgID: orgID.StringValue(), Email: "test@example.com",
	})
	rule := ThresholdRuleAtLeastOnceValueAbove(10, nil)
	rule.Disabled = true
	raw, err := json.Marshal(rule)
	require.NoError(t, err)
	var parsed ruletypes.PostableRule
	require.NoError(t, json.Unmarshal(raw, &parsed))
	require.NoError(t, parsed.Validate())
	require.True(t, parsed.Disabled)
	require.NotNil(t, parsed.NotificationSettings)
	require.False(t, parsed.NotificationSettings.UsePolicy)
	requests, err := parsed.GetRuleRouteRequest(ruleID.StringValue())
	require.NoError(t, err)
	inhibitors, err := parsed.GetInhibitRules(ruleID.StringValue())
	require.NoError(t, err)

	for _, tc := range []struct {
		name      string
		operation string
		failAt    string
		wantCalls []string
	}{
		{
			name: "create/inhibitors", operation: "create", failAt: "CreateInhibitRules",
			wantCalls: []string{"CreateRoutePolicies", "CreateInhibitRules"},
		},
		{
			name: "edit/delete_inhibitors", operation: "edit", failAt: "DeleteAllInhibitRulesByRuleId",
			wantCalls: []string{"UpdateAllRoutePoliciesByRuleId", "DeleteAllInhibitRulesByRuleId"},
		},
		{
			name: "edit/create_inhibitors_second_write", operation: "edit", failAt: "CreateInhibitRules",
			wantCalls: []string{"UpdateAllRoutePoliciesByRuleId", "DeleteAllInhibitRulesByRuleId", "CreateInhibitRules"},
		},
		{
			name: "delete/config", operation: "delete", failAt: "SetConfig",
			wantCalls: []string{"GetConfig", "SetConfig"},
		},
		{
			name: "delete/inhibitors", operation: "delete", failAt: "DeleteAllInhibitRulesByRuleId",
			wantCalls: []string{"GetConfig", "SetConfig", "DeleteAllRoutePoliciesByRuleId", "DeleteAllInhibitRulesByRuleId"},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			conflict := errors.New(errors.TypeAlreadyExists, alertmanagertypes.ErrCodeAlertmanagerConfigConflict,
				"alertmanager configuration changed concurrently")
			am := alertmanagertest.NewMockAlertmanager(t)
			am.On("SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
			am.On("DeleteNotificationConfig", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
			switch tc.operation {
			case "create":
				am.On("CreateRoutePolicies", ctx, requests).Return(nil, nil).Once()
				am.On("CreateInhibitRules", ctx, orgID, inhibitors).Return(conflict).Once()
			case "edit":
				am.On("UpdateAllRoutePoliciesByRuleId", ctx, ruleID.StringValue(), requests).Return(nil).Once()
				if tc.failAt == "DeleteAllInhibitRulesByRuleId" {
					am.On("DeleteAllInhibitRulesByRuleId", ctx, orgID, ruleID.StringValue()).Return(conflict).Once()
				} else {
					am.On("DeleteAllInhibitRulesByRuleId", ctx, orgID, ruleID.StringValue()).Return(nil).Once()
					am.On("CreateInhibitRules", ctx, orgID, inhibitors).Return(conflict).Once()
				}
			case "delete":
				cfg, err := alertmanagertypes.NewDefaultConfig(alertmanagertypes.GlobalConfig{}, alertmanagertypes.RouteConfig{
					GroupInterval: time.Minute, GroupWait: time.Minute, RepeatInterval: time.Minute,
				}, orgID.StringValue())
				require.NoError(t, err)
				am.On("GetConfig", ctx, orgID.StringValue()).Return(cfg, nil).Once()
				if tc.failAt == "SetConfig" {
					am.On("SetConfig", ctx, cfg).Return(conflict).Once()
				} else {
					am.On("SetConfig", ctx, cfg).Return(nil).Once()
					am.On("DeleteAllRoutePoliciesByRuleId", ctx, ruleID.StringValue()).Return(nil).Once()
					am.On("DeleteAllInhibitRulesByRuleId", ctx, orgID, ruleID.StringValue()).Return(conflict).Once()
				}
			}
			store := &configConflictRuleStore{rule: ruletypes.StorableRule{
				Identifiable: types.Identifiable{ID: ruleID}, OrgID: orgID.StringValue(), Data: string(raw),
			}}
			mgr, err := NewManager(&ManagerOptions{
				RuleStore: store, Alertmanager: am,
				PrepareTaskFunc: func(PrepareTaskOptions) (Task, error) {
					panic("config conflict must not prepare a task")
				},
			})
			require.NoError(t, err)
			task := &configConflictTask{}
			existingRule := &struct{ Rule }{}
			taskName := prepareTaskName(ruleID.StringValue())
			mgr.tasks[taskName] = task
			mgr.rules[ruleID.StringValue()] = existingRule

			switch tc.operation {
			case "create":
				var created *ruletypes.GettableRule
				created, err = mgr.CreateRule(ctx, string(raw))
				require.Nil(t, created)
			case "edit":
				err = mgr.EditRule(ctx, string(raw), ruleID)
			case "delete":
				err = mgr.DeleteRule(ctx, ruleID.StringValue())
			}

			require.ErrorIs(t, err, conflict)
			require.Equal(t, 1, store.callbackCalls)
			am.AssertNotCalled(t, "SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
			am.AssertNotCalled(t, "DeleteNotificationConfig", mock.Anything, mock.Anything, mock.Anything)
			var calls []string
			for _, call := range am.Calls {
				calls = append(calls, call.Method)
			}
			require.Equal(t, tc.wantCalls, calls)
			require.False(t, task.stopped)
			require.Len(t, mgr.tasks, 1)
			require.Same(t, task, mgr.tasks[taskName])
			require.Len(t, mgr.rules, 1)
			require.Same(t, existingRule, mgr.rules[ruleID.StringValue()])
		})
	}
}
