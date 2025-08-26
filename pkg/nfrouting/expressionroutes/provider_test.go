package expressionroutes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/routingtypes"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProvider_Match_BasicExpressions(t *testing.T) {
	tests := []struct {
		name        string
		expression  string
		labelSet    model.LabelSet
		expected    []string
		shouldMatch bool
	}{
		{
			name:       "simple equality match",
			expression: `labels["threshold.name"] == 'critical'`,
			labelSet: model.LabelSet{
				"threshold.name": "critical",
			},
			expected:    []string{"slack-critical"},
			shouldMatch: true,
		},
		{
			name:       "simple equality no match",
			expression: `labels["threshold.name"] == 'critical'`,
			labelSet: model.LabelSet{
				"threshold.name": "warning",
			},
			expected:    []string{},
			shouldMatch: false,
		},
		{
			name:       "not equals match",
			expression: `labels["host"] != 'host-3'`,
			labelSet: model.LabelSet{
				"host": "host-1",
			},
			expected:    []string{"slack-critical"},
			shouldMatch: true,
		},
		{
			name:       "not equals no match",
			expression: `labels["host"] != 'host-3'`,
			labelSet: model.LabelSet{
				"host": "host-3",
			},
			expected:    []string{},
			shouldMatch: false,
		},
		{
			name:       "in operator match",
			expression: `labels["service"] in ['auth', 'payment']`,
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected:    []string{"slack-critical"},
			shouldMatch: true,
		},
		{
			name:       "in operator no match",
			expression: `labels["service"] in ['auth', 'payment']`,
			labelSet: model.LabelSet{
				"service": "frontend",
			},
			expected:    []string{},
			shouldMatch: false,
		},
		{
			name:       "contains function match",
			expression: `labels["host"].contains('prod')`,
			labelSet: model.LabelSet{
				"host": "prod-server-1",
			},
			expected:    []string{"slack-critical"},
			shouldMatch: true,
		},
		{
			name:       "contains function no match",
			expression: `labels["host"].contains('prod')`,
			labelSet: model.LabelSet{
				"host": "dev-server-1",
			},
			expected:    []string{},
			shouldMatch: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			routes := map[string][]routingtypes.ExpressionRoutes{
				"org1": {
					{
						Expression: tt.expression,
						Actions: routingtypes.Actions{
							Channels: []string{"slack-critical"},
						},
					},
				},
			}

			provider := NewProvider(routes)
			result := provider.Match(nil, "org1", tt.labelSet)

			if tt.shouldMatch {
				assert.Equal(t, tt.expected, result)
			} else {
				assert.Empty(t, result)
			}
		})
	}
}

func TestProvider_Match_ComplexExpressions(t *testing.T) {
	tests := []struct {
		name        string
		expression  string
		labelSet    model.LabelSet
		expected    []string
		shouldMatch bool
	}{
		{
			name:       "complex AND expression match",
			expression: `labels["threshold.name"] == 'critical' && labels["service"] in ['auth', 'payment'] && labels["host"] != 'host-3'`,
			labelSet: model.LabelSet{
				"threshold.name": "critical",
				"service":        "auth",
				"host":           "host-1",
			},
			expected:    []string{"slack-critical", "email-alerts"},
			shouldMatch: true,
		},
		{
			name:       "complex AND expression partial match",
			expression: `labels["threshold.name"] == 'critical' && labels["service"] in ['auth', 'payment'] && labels["host"] != 'host-3'`,
			labelSet: model.LabelSet{
				"threshold.name": "critical",
				"service":        "frontend", // This doesn't match
				"host":           "host-1",
			},
			expected:    []string{},
			shouldMatch: false,
		},
		{
			name:       "complex OR expression match",
			expression: `labels["threshold.name"] == 'critical' || labels["k8s.namespace.name"] == 'auth'`,
			labelSet: model.LabelSet{
				"threshold.name":     "warning",
				"k8s.namespace.name": "auth", // This matches
			},
			expected:    []string{"slack-critical", "email-alerts"},
			shouldMatch: true,
		},
		{
			name:       "parentheses grouping",
			expression: `(labels["threshold.name"] == 'critical' || labels["threshold.name"] == 'high') && labels["service"] in ['auth', 'payment']`,
			labelSet: model.LabelSet{
				"threshold.name": "high",
				"service":        "payment",
			},
			expected:    []string{"slack-critical", "email-alerts"},
			shouldMatch: true,
		},
		{
			name:       "string functions with AND",
			expression: `labels["host"].startsWith('prod-') && labels["service"].contains('api')`,
			labelSet: model.LabelSet{
				"host":    "prod-server-1",
				"service": "user-api",
			},
			expected:    []string{"slack-critical", "email-alerts"},
			shouldMatch: true,
		},
	}

	routes := map[string][]routingtypes.ExpressionRoutes{
		"org1": {
			{
				Expression: "", // Will be set in test
				Actions: routingtypes.Actions{
					Channels: []string{"slack-critical", "email-alerts"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Update expression for this test
			routes["org1"][0].Expression = tt.expression
			provider := NewProvider(routes)
			result := provider.Match(nil, "org1", tt.labelSet)

			if tt.shouldMatch {
				assert.Equal(t, tt.expected, result)
			} else {
				assert.Empty(t, result)
			}
		})
	}
}

func TestProvider_Match_MultipleRoutes(t *testing.T) {
	routes := map[string][]routingtypes.ExpressionRoutes{
		"org1": {
			{
				Expression: `labels["threshold.name"] == 'critical'`,
				Actions: routingtypes.Actions{
					Channels: []string{"slack-critical"},
				},
			},
			{
				Expression: `labels["service"] == 'auth'`,
				Actions: routingtypes.Actions{
					Channels: []string{"email-auth"},
				},
			},
			{
				Expression: `labels["host"].contains('prod')`,
				Actions: routingtypes.Actions{
					Channels: []string{"pagerduty-prod"},
				},
			},
		},
	}

	provider := NewProvider(routes)

	t.Run("multiple routes match", func(t *testing.T) {
		labelSet := model.LabelSet{
			"threshold.name": "critical",
			"service":        "auth",
			"host":           "prod-server",
		}

		result := provider.Match(nil, "org1", labelSet)
		expected := []string{"slack-critical", "email-auth", "pagerduty-prod"}
		assert.ElementsMatch(t, expected, result)
	})

	t.Run("single route matches", func(t *testing.T) {
		labelSet := model.LabelSet{
			"threshold.name": "warning",
			"service":        "auth",
			"host":           "dev-server",
		}

		result := provider.Match(nil, "org1", labelSet)
		expected := []string{"email-auth"}
		assert.Equal(t, expected, result)
	})

	t.Run("no routes match", func(t *testing.T) {
		labelSet := model.LabelSet{
			"threshold.name": "info",
			"service":        "frontend",
			"host":           "dev-server",
		}

		result := provider.Match(nil, "org1", labelSet)
		assert.Empty(t, result)
	})
}

func TestProvider_Match_EdgeCases(t *testing.T) {
	routes := map[string][]routingtypes.ExpressionRoutes{
		"org1": {
			{
				Expression: `labels["threshold.name"] == 'critical'`,
				Actions: routingtypes.Actions{
					Channels: []string{"slack-critical"},
				},
			},
		},
		"org2": {
			{
				Expression: "invalid expression syntax &&& ||",
				Actions: routingtypes.Actions{
					Channels: []string{"should-not-match"},
				},
			},
		},
	}

	provider := NewProvider(routes)

	t.Run("org not found", func(t *testing.T) {
		result := provider.Match(nil, "nonexistent-org", model.LabelSet{})
		assert.Empty(t, result)
	})

	t.Run("invalid expression", func(t *testing.T) {
		labelSet := model.LabelSet{
			"threshold.name": "critical",
		}
		result := provider.Match(nil, "org2", labelSet)
		assert.Empty(t, result, "Invalid expressions should return empty result")
	})

	t.Run("empty label set", func(t *testing.T) {
		result := provider.Match(nil, "org1", model.LabelSet{})
		assert.Empty(t, result, "Empty label set should not match")
	})

	t.Run("missing label in expression", func(t *testing.T) {
		routes := map[string][]routingtypes.ExpressionRoutes{
			"org1": {
				{
					Expression: "nonexistent_label == 'value'",
					Actions: routingtypes.Actions{
						Channels: []string{"should-not-match"},
					},
				},
			},
		}
		provider := NewProvider(routes)

		labelSet := model.LabelSet{
			"threshold.name": "critical",
		}
		result := provider.Match(nil, "org1", labelSet)
		assert.Empty(t, result, "Missing labels should not match")
	})
}

func TestProvider_Match_DotNotationSupport(t *testing.T) {
	routes := map[string][]routingtypes.ExpressionRoutes{
		"org1": {
			{
				Expression: `labels["threshold.name"] == 'critical' && labels["alert.rule.id"] == '123'`,
				Actions: routingtypes.Actions{
					Channels: []string{"dot-notation-labels"},
				},
			},
		},
	}

	provider := NewProvider(routes)

	t.Run("CEL-Go bracket notation support", func(t *testing.T) {
		labelSet := model.LabelSet{
			"threshold.name": "critical", // Accessed with labels["threshold.name"]
			"alert.rule.id":  "123",      // Accessed with labels["alert.rule.id"]
		}

		result := provider.Match(nil, "org1", labelSet)
		expected := []string{"dot-notation-labels"}
		assert.Equal(t, expected, result)
	})
}

func TestProvider_Match_BuiltInFunctions(t *testing.T) {
	tests := []struct {
		name        string
		expression  string
		labelSet    model.LabelSet
		shouldMatch bool
	}{
		{
			name:       "startsWith function",
			expression: `labels["host"].startsWith('prod-')`,
			labelSet: model.LabelSet{
				"host": "prod-web-server-01",
			},
			shouldMatch: true,
		},
		{
			name:       "endsWith function",
			expression: `labels["service"].endsWith('-api')`,
			labelSet: model.LabelSet{
				"service": "user-api",
			},
			shouldMatch: true,
		},
		{
			name:       "len function with array",
			expression: "len(tags) > 2",
			labelSet:   model.LabelSet{
				// Note: This would need special handling for arrays in real implementation
			},
			shouldMatch: false, // Will fail gracefully
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			routes := map[string][]routingtypes.ExpressionRoutes{
				"org1": {
					{
						Expression: tt.expression,
						Actions: routingtypes.Actions{
							Channels: []string{"test-channel"},
						},
					},
				},
			}

			provider := NewProvider(routes)
			result := provider.Match(nil, "org1", tt.labelSet)

			if tt.shouldMatch {
				assert.NotEmpty(t, result)
			} else {
				assert.Empty(t, result)
			}
		})
	}
}

func TestNewProvider(t *testing.T) {
	routes := map[string][]routingtypes.ExpressionRoutes{
		"org1": {
			{
				Expression: "test == 'value'",
				Actions: routingtypes.Actions{
					Channels: []string{"test"},
				},
			},
		},
	}

	provider := NewProvider(routes)
	require.NotNil(t, provider)
	assert.Equal(t, routes, provider.routes)
}
