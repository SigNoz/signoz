package alertmanagertypes

import (
	"reflect"
	"testing"

	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvalExpression(t *testing.T) {
	testCases := []struct {
		name       string
		expression string
		lset       model.LabelSet
		want       bool
		wantErr    bool
	}{
		{
			name:       "Equality_Match",
			expression: `env = "production"`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "Equality_NoMatch",
			expression: `env = "production"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       false,
		},
		{
			name:       "Inequality_Match",
			expression: `env != "production"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       true,
		},
		{
			name:       "And_BothMatch",
			expression: `env = "production" AND service = "api"`,
			lset:       model.LabelSet{"env": "production", "service": "api"},
			want:       true,
		},
		{
			name:       "And_PartialMatch",
			expression: `env = "production" AND service = "api"`,
			lset:       model.LabelSet{"env": "production", "service": "worker"},
			want:       false,
		},
		{
			name:       "Or_FirstMatches",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "Or_SecondMatches",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       true,
		},
		{
			name:       "Or_NoneMatch",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "development"},
			want:       false,
		},
		{
			name:       "UndefinedLabel_ReturnsFalse",
			expression: `env = "production"`,
			lset:       model.LabelSet{"service": "api"},
			want:       false,
		},
		{
			name:       "MissingDottedLabel_ReturnsFalse",
			expression: `service.name = "api"`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
		},
		{
			name:       "MissingDeepDottedLabel_ReturnsFalse",
			expression: `k8s.namespace.name = "api"`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
		},
		{
			name:       "Or_MissingDottedLabelFirst_SecondMatches",
			expression: `service.name = "api" OR http.status_code = "501"`,
			lset:       model.LabelSet{"http.status_code": "501"},
			want:       true,
		},
		{
			name:       "Or_FirstFails_MissingDottedLabelSecond",
			expression: `env = "production" OR service.name = "api"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       false,
		},
		{
			name:       "InList_Present",
			expression: `env in ["production", "staging"]`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "InList_Absent",
			expression: `env in ["production", "staging"]`,
			lset:       model.LabelSet{"env": "development"},
			want:       false,
		},
		{
			name:       "InvalidExpression_ReturnsError",
			expression: `env =`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
			wantErr:    true,
		},
		{
			name:       "NonBoolExpression_ReturnsError",
			expression: `env`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
			wantErr:    true,
		},
		{
			name:       "Equality_Match_ExprSyntax",
			expression: `threshold.name == 'auth' && ruleId == 'rule1'`,
			lset: model.LabelSet{
				"threshold.name": "auth",
				"ruleId":         "rule1",
			},
			want: true,
		},
		{
			name:       "Equality_Match_QBSyntax",
			expression: `threshold.name = 'auth' AND ruleId = 'rule1'`,
			lset: model.LabelSet{
				"threshold.name": "auth",
				"ruleId":         "rule1",
			},
			want: true,
		},
		{
			name:       "Equality_NoMatch_ExprSyntax",
			expression: `service == "payment"`,
			lset: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			want: false,
		},
		{
			name:       "And_BothMatch_ExprSyntax",
			expression: `service == "auth" && env == "production"`,
			lset: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			want: true,
		},
		{
			name:       "And_OneMismatch_ExprSyntax",
			expression: `service == "auth" && env == "staging"`,
			lset: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			want: false,
		},
		{
			name:       "Or_OneMatches_ExprSyntax",
			expression: `service == "payment" || env == "production"`,
			lset: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			want: true,
		},
		{
			name:       "Or_NoneMatch_ExprSyntax",
			expression: `service == "payment" || env == "staging"`,
			lset: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			want: false,
		},
		{
			name:       "In_ValueInList_Uppercase",
			expression: `service IN ["auth", "payment", "notification"]`,
			lset: model.LabelSet{
				"service": "auth",
			},
			want: true,
		},
		{
			name:       "In_ValueNotInList_Uppercase",
			expression: `service IN ["payment", "notification"]`,
			lset: model.LabelSet{
				"service": "auth",
			},
			want: false,
		},
		{
			name:       "Contains_SubstringMatch_Lowercase",
			expression: `host contains "prod"`,
			lset: model.LabelSet{
				"host": "prod-server-01",
			},
			want: true,
		},
		{
			name:       "Contains_SubstringMatch_Uppercase",
			expression: `host CONTAINS "prod"`,
			lset: model.LabelSet{
				"host": "prod-server-01",
			},
			want: true,
		},
		{
			name:       "Contains_NoSubstringMatch_Lowercase",
			expression: `host contains "staging"`,
			lset: model.LabelSet{
				"host": "prod-server-01",
			},
			want: false,
		},
		{
			name:       "Contains_NoSubstringMatch_Uppercase",
			expression: `host CONTAINS "staging"`,
			lset: model.LabelSet{
				"host": "prod-server-01",
			},
			want: false,
		},
		{
			name:       "Parentheses_Match_ExprSyntax",
			expression: `(service == "auth" && env == "production") || critical == "true"`,
			lset: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			want: true,
		},
		{
			name:       "Parentheses_Match_QBSyntax",
			expression: `(service = "auth" AND env = "production") OR critical = "true"`,
			lset: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			want: true,
		},
		{
			name:       "MissingLabelKey_NoMatch_ExprSyntax",
			expression: `"missing_key" == "value"`,
			lset: model.LabelSet{
				"service": "auth",
			},
			want: false,
		},
		{
			name:       "MissingLabelKey_NoMatch_QBSyntax",
			expression: `"missing_key" = "value"`,
			lset: model.LabelSet{
				"service": "auth",
			},
			want: false,
		},
		{
			name:       "QuotedThresholdName_NoMatch_ExprSyntax",
			expression: `'threshold.name' == "high-cpu" && ruleId == "rule-123"`,
			lset: model.LabelSet{
				"threshold.name": "high-cpu",
				"ruleId":         "rule-123",
				"service":        "auth",
			},
			want: false, //no commas
		},
		{
			name:       "QuotedThresholdName_NoMatch_MixedSyntax",
			expression: `'threshold.name' = "high-cpu" AND ruleId == "rule-123"`,
			lset: model.LabelSet{
				"threshold.name": "high-cpu",
				"ruleId":         "rule-123",
				"service":        "auth",
			},
			want: false, //no commas
		},
		{
			name:       "KubernetesNamespace_Match_ExprSyntax",
			expression: `k8s.namespace.name == "auth" && service in ["auth", "payment"]`,
			lset: model.LabelSet{
				"k8s.namespace.name": "auth",
				"service":            "auth",
				"host":               "k8s-node-1",
			},
			want: true,
		},
		{
			name:       "KubernetesNamespace_Match_MixedSyntax",
			expression: `k8s.namespace.name = "auth" && service IN ["auth", "payment"]`,
			lset: model.LabelSet{
				"k8s.namespace.name": "auth",
				"service":            "auth",
				"host":               "k8s-node-1",
			},
			want: true,
		},
		{
			name:       "MigrationFormat_Match_MixedSyntax",
			expression: `threshold.name = "HighCPUUsage" && ruleId = "rule-uuid-123"`,
			lset: model.LabelSet{
				"threshold.name": "HighCPUUsage",
				"ruleId":         "rule-uuid-123",
				"severity":       "warning",
			},
			want: true,
		},
		{
			name:       "CaseSensitive_NoMatch_ExprSyntax",
			expression: `service == "Auth"`, // capital A
			lset: model.LabelSet{
				"service": "auth", // lowercase a
			},
			want: false,
		},
		{
			name:       "CaseSensitive_NoMatch_QBSyntax",
			expression: `service = "Auth"`, // capital A
			lset: model.LabelSet{
				"service": "auth", // lowercase a
			},
			want: false,
		},
		{
			name:       "OperatorPrecedence_Match_ExprSyntax",
			expression: `service == "auth" && env == "prod" || critical == "true"`,
			lset: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			want: true,
		},
		{
			name:       "OperatorPrecedence_Match_QBSyntax",
			expression: `service = "auth" AND env = "prod" OR critical = "true"`,
			lset: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			want: true,
		},
		{
			name:       "Or_MissingKey_OtherSideMatches",
			expression: `threshold.name = 'warning' OR ruleId = 'rule1'`,
			lset: model.LabelSet{
				"threshold.name": "warning",
			},
			want: true,
		},
		{
			name:       "And_MissingKey_NoMatch",
			expression: `threshold.name = 'warning' && nonexistent = 'auth'`,
			lset: model.LabelSet{
				"threshold.name": "warning",
			},
			want: false,
		},
		{
			name:       "Or_MissingDottedLabelSecond_OtherSideMatches",
			expression: `http.status_code = '501' OR service.name = 'otel-demo'`,
			lset: model.LabelSet{
				"http.status_code": "501",
			},
			want: true,
		},
		{
			name:       "And_MissingDottedLabel_NoMatch",
			expression: `service.name = 'otel-demo' AND http.status_code = '501'`,
			lset: model.LabelSet{
				"http.status_code": "501",
			},
			want: false,
		},
		{
			name:       "MissingLeafUnderExistingPrefix_NoMatch",
			expression: `k8s.pod.name = 'checkout'`,
			lset: model.LabelSet{
				"k8s.node.name": "node-1",
			},
			want: false,
		},
		{
			name:       "PlainLabelUsedAsPrefix_IsNil",
			expression: `deployment.environment = nil`,
			lset: model.LabelSet{
				"deployment": "blue",
			},
			want: true,
		},
		{
			name:       "Or_PlainLabelUsedAsPrefix_OtherSideMatches",
			expression: `region.zone = 'us-east-1a' OR team = 'payments'`,
			lset: model.LabelSet{
				"region": "us-east-1",
				"team":   "payments",
			},
			want: true,
		},
		{
			name:       "BracketAccessOnDottedLabel_Match",
			expression: `cloud["provider"] = 'aws'`,
			lset: model.LabelSet{
				"cloud.provider": "aws",
			},
			want: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			env, _ := ConvertLabelSetToEnv(testCase.lset)
			got, err := EvalExpression(testCase.expression, env)
			if testCase.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, testCase.want, got)
		})
	}
}

func TestConvertLabelSetToEnv(t *testing.T) {
	cases := []struct {
		name         string
		lset         model.LabelSet
		expected     map[string]interface{}
		wantConflict bool
	}{
		{
			name:     "simple keys",
			lset:     model.LabelSet{"key1": "value1", "key2": "value2"},
			expected: map[string]interface{}{"key1": "value1", "key2": "value2"},
		},
		{
			name: "dotted keys become nested maps",
			lset: model.LabelSet{"foo.bar": "value1", "foo.baz": "value2"},
			expected: map[string]interface{}{
				"foo": map[string]interface{}{"bar": "value1", "baz": "value2"},
			},
		},
		{
			name: "deeper dotted key wins over shallow dotted key",
			lset: model.LabelSet{"foo.bar.baz": "deep", "foo.bar": "shallow"},
			expected: map[string]interface{}{
				"foo": map[string]interface{}{
					"bar": map[string]interface{}{"baz": "deep"},
				},
			},
			wantConflict: true,
		},
		{
			name: "nested structure wins over plain key",
			lset: model.LabelSet{"foo.bar": "value", "foo": "ignored"},
			expected: map[string]interface{}{
				"foo": map[string]interface{}{"bar": "value"},
			},
			wantConflict: true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, gotConflict := ConvertLabelSetToEnv(c.lset)
			if !reflect.DeepEqual(got, c.expected) {
				t.Errorf("ConvertLabelSetToEnv() map = %v, want %v", got, c.expected)
			}
			if gotConflict != c.wantConflict {
				t.Errorf("ConvertLabelSetToEnv() conflict = %v, want %v", gotConflict, c.wantConflict)
			}
		})
	}
}
