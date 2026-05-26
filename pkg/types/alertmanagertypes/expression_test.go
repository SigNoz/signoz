package alertmanagertypes

import (
	"reflect"
	"testing"

	"github.com/prometheus/common/model"
)

func TestEvalScopeExpression(t *testing.T) {
	cases := []struct {
		name       string
		expression string
		lset       model.LabelSet
		want       bool
		wantErr    bool
	}{
		{
			name:       "equality match",
			expression: `env = "production"`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "equality no match",
			expression: `env = "production"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       false,
		},
		{
			name:       "inequality match",
			expression: `env != "production"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       true,
		},
		{
			name:       "AND - both match",
			expression: `env = "production" AND service = "api"`,
			lset:       model.LabelSet{"env": "production", "service": "api"},
			want:       true,
		},
		{
			name:       "AND - partial match",
			expression: `env = "production" AND service = "api"`,
			lset:       model.LabelSet{"env": "production", "service": "worker"},
			want:       false,
		},
		{
			name:       "OR - first matches",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "OR - second matches",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "staging"},
			want:       true,
		},
		{
			name:       "OR - none match",
			expression: `env = "production" OR env = "staging"`,
			lset:       model.LabelSet{"env": "development"},
			want:       false,
		},
		{
			name:       "undefined label returns false",
			expression: `env = "production"`,
			lset:       model.LabelSet{"service": "api"},
			want:       false,
		},
		{
			name:       "in list - present",
			expression: `env in ["production", "staging"]`,
			lset:       model.LabelSet{"env": "production"},
			want:       true,
		},
		{
			name:       "in list - absent",
			expression: `env in ["production", "staging"]`,
			lset:       model.LabelSet{"env": "development"},
			want:       false,
		},
		{
			name:       "invalid expression returns error",
			expression: `env =`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
			wantErr:    true,
		},
		{
			name:       "non-bool expression returns error",
			expression: `env`,
			lset:       model.LabelSet{"env": "production"},
			want:       false,
			wantErr:    true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := EvalScopeExpression(c.expression, c.lset)
			if (err != nil) != c.wantErr {
				t.Errorf("EvalScopeExpression(%q, %v) error = %v, wantErr %v", c.expression, c.lset, err, c.wantErr)
			}
			if got != c.want {
				t.Errorf("EvalScopeExpression(%q, %v) = %v, want %v", c.expression, c.lset, got, c.want)
			}
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
