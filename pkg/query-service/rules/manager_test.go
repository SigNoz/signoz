package rules

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/ruler/rulestore/rulestoretest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestManager_PatchRule_PayloadVariations(t *testing.T) {
	testCases := []struct {
		name           string
		originalData   string
		patchData      string
		expectedResult func(*ruletypes.GettableRule) bool
		expectError    bool
		description    string
	}{
		{
			name:         "patch with disabled field",
			originalData: `{"alertName":"original-alert","disabled":false}`,
			patchData:    `{"disabled": true}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.Disabled == true && result.AlertName == "original-alert"
			},
			expectError: false,
		},
		{
			name:         "patch with alertName field",
			originalData: `{"alertName":"original-alert","disabled":false}`,
			patchData:    `{"alertName": "Updated Alert Name"}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.AlertName == "Updated Alert Name" && result.Disabled == false
			},
			expectError: false,
		},
		{
			name:         "patch with multiple fields",
			originalData: `{"alertName":"original-alert","disabled":false,"labels":{"severity":"warning"}}`,
			patchData:    `{"alertName": "Multi Field Update", "disabled": true}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.AlertName == "Multi Field Update" && result.Disabled == true
			},
			expectError: false,
		},
		{
			name:         "patch with nested object",
			originalData: `{"alertName":"original-alert","labels":{"severity":"warning"}}`,
			patchData:    `{"labels": {"severity": "critical", "team": "platform"}}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.Labels["severity"] == "critical" && result.Labels["team"] == "platform"
			},
			expectError: false,
		},
		{
			name:         "patch with array field",
			originalData: `{"alertName":"original-alert","preferredChannels":["email"]}`,
			patchData:    `{"preferredChannels": ["email", "slack"]}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return len(result.PreferredChannels) == 2 &&
					result.PreferredChannels[0] == "email" &&
					result.PreferredChannels[1] == "slack"
			},
			expectError: false,
		},
		{
			name:         "empty patch object",
			originalData: `{"alertName":"original-alert","disabled":false}`,
			patchData:    `{}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.AlertName == "original-alert" && result.Disabled == false
			},
			expectError: false,
		},
		{
			name:         "disbaled false",
			originalData: `{"alertName":"original-alert","disabled":true}`,
			patchData:    `{"disabled": false}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.Disabled == false && result.AlertName == "original-alert"
			},
			expectError: false,
		},
		{
			name:         "large JSON payload",
			originalData: `{"alertName":"original-alert","disabled":false,"labels":{"env":"dev"}}`,
			patchData:    `{"alertName": "Large Update", "disabled": false, "labels": {"env": "prod", "service": "api", "owner": "team-alpha"}, "annotations": {"description": "This is a comprehensive rule update", "runbook": "https://wiki.example.com/alerts"}}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.AlertName == "Large Update" &&
					result.Labels["env"] == "prod" &&
					result.Labels["service"] == "api" &&
					result.Labels["owner"] == "team-alpha" &&
					result.Annotations["description"] == "This is a comprehensive rule update"
			},
			expectError: false,
		},
		{
			name:         "invalid JSON",
			originalData: `{"alertName":"original-alert"}`,
			patchData:    `{disabled: true}`,
			expectError:  true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRuleStore := &rulestoretest.MockRuleStore{}
			manager := &Manager{
				tasks:     make(map[string]Task),
				rules:     make(map[string]Rule),
				ruleStore: mockRuleStore,
			}

			ruleID := valuer.GenerateUUID()
			existingRule := &ruletypes.Rule{
				Identifiable: types.Identifiable{
					ID: ruleID,
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: "creator@example.com",
					UpdatedBy: "creator@example.com",
				},
				Data: tc.originalData,
			}
			mockRuleStore.On("GetStoredRule", mock.Anything, ruleID).Return(existingRule, nil)
			claims := authtypes.Claims{
				UserID: "550e8400-e29b-41d4-a716-446655440000",
				OrgID:  "550e8400-e29b-41d4-a716-446655440001",
				Email:  "test@example.com",
				Role:   "admin",
			}
			ctx := authtypes.NewContextWithClaims(context.Background(), claims)
			result, err := manager.PatchRule(ctx, tc.patchData, ruleID)
			if tc.expectError {
				assert.Error(t, err, tc.description)
				assert.Nil(t, result)
			} else {
				mockRuleStore.AssertExpectations(t)
				if err != nil {
					errorMsg := err.Error()
					assert.NotContains(t, errorMsg, "json")
					assert.NotContains(t, errorMsg, "unmarshal")
				}
			}
		})
	}
}
