package querier

import (
	"log/slog"
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestConvertToVariableValues(t *testing.T) {
	tests := []struct {
		name      string
		vars      map[string]qbtypes.VariableItem
		wantCount int
		wantAll   map[string]bool // variable name -> expected IsSelectAll value
	}{
		{
			name:      "empty vars",
			vars:      map[string]qbtypes.VariableItem{},
			wantCount: 0,
			wantAll:   map[string]bool{},
		},
		{
			name: "single dynamic variable with __all__",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			wantCount: 1,
			wantAll:   map[string]bool{"service": true},
		},
		{
			name: "single dynamic variable with specific value",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "frontend",
				},
			},
			wantCount: 1,
			wantAll:   map[string]bool{"service": false},
		},
		{
			name: "multiple variables mixed",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
				"region": {
					Type:  qbtypes.QueryVariableType,
					Value: "__all__", // Query type shouldn't be marked as __all__
				},
			},
			wantCount: 3,
			wantAll:   map[string]bool{"service": true, "env": false, "region": false},
		},
		{
			name: "non-string value",
			vars: map[string]qbtypes.VariableItem{
				"count": {
					Type:  qbtypes.DynamicVariableType,
					Value: 123,
				},
			},
			wantCount: 1,
			wantAll:   map[string]bool{"count": false},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := convertToVariableValues(tt.vars)

			if len(result) != tt.wantCount {
				t.Errorf("convertToVariableValues() returned %d items, want %d", len(result), tt.wantCount)
			}

			// Build a map of results for easier checking
			resultMap := make(map[string]bool)
			for _, v := range result {
				resultMap[v.Name] = v.IsSelectAll
			}

			for name, wantSelectAll := range tt.wantAll {
				if gotSelectAll, ok := resultMap[name]; !ok {
					t.Errorf("convertToVariableValues() missing variable %q", name)
				} else if gotSelectAll != wantSelectAll {
					t.Errorf("convertToVariableValues() variable %q IsSelectAll = %v, want %v", name, gotSelectAll, wantSelectAll)
				}
			}
		})
	}
}

func TestHasAllVars(t *testing.T) {
	tests := []struct {
		name string
		vars map[string]qbtypes.VariableItem
		want bool
	}{
		{
			name: "empty vars",
			vars: map[string]qbtypes.VariableItem{},
			want: false,
		},
		{
			name: "no __all__ variables",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "frontend",
				},
			},
			want: false,
		},
		{
			name: "has __all__ variable",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			want: true,
		},
		{
			name: "mixed variables with one __all__",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
			},
			want: true,
		},
		{
			name: "query variable type with __all__ value should not count",
			vars: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.QueryVariableType,
					Value: "__all__",
				},
			},
			want: false,
		},
		{
			name: "non-string value",
			vars: map[string]qbtypes.VariableItem{
				"count": {
					Type:  qbtypes.DynamicVariableType,
					Value: 123,
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := hasAllVars(tt.vars); got != tt.want {
				t.Errorf("hasAllVars() = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestRenderVarsWithAllVariables tests the integration of QueryTransformer
// with renderVars for handling __all__ dynamic variables.
// This validates the fix for: https://github.com/SigNoz/signoz/issues/9889
func TestRenderVarsWithAllVariables(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)

	tests := []struct {
		name           string
		query          string
		vars           map[string]qbtypes.VariableItem
		wantContains   []string // substrings that should be in result
		wantNotContain []string // substrings that should NOT be in result
	}{
		{
			name:  "no variables - query unchanged",
			query: "SELECT * FROM traces WHERE status = 'error'",
			vars:  map[string]qbtypes.VariableItem{},
			wantContains: []string{
				"SELECT * FROM traces WHERE status = 'error'",
			},
		},
		{
			name:  "specific value - normal substitution",
			query: "SELECT * FROM traces WHERE service_name = $service_name",
			vars: map[string]qbtypes.VariableItem{
				"service_name": {
					Type:  qbtypes.DynamicVariableType,
					Value: "frontend",
				},
			},
			wantContains: []string{
				"frontend",
			},
		},
		{
			name:  "__all__ variable - filter should be removed",
			query: "SELECT * FROM traces WHERE service_name = $service_name AND status = 'error'",
			vars: map[string]qbtypes.VariableItem{
				"service_name": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			wantContains: []string{
				"status = 'error'",
			},
			wantNotContain: []string{
				"service_name =",
			},
		},
		{
			name:  "mixed __all__ and specific values",
			query: "SELECT * FROM traces WHERE service_name = $service_name AND env = $env",
			vars: map[string]qbtypes.VariableItem{
				"service_name": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
			},
			wantContains: []string{
				"production",
			},
			wantNotContain: []string{
				"service_name =",
			},
		},
		{
			name:  "query variable type with __all__ - should NOT remove filter",
			query: "SELECT * FROM traces WHERE service_name = $service_name",
			vars: map[string]qbtypes.VariableItem{
				"service_name": {
					Type:  qbtypes.QueryVariableType,
					Value: "__all__",
				},
			},
			wantContains: []string{
				"__all__", // should be substituted as literal value
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := &chSQLQuery{
				logger: logger,
			}

			result, err := q.renderVars(tt.query, tt.vars, 0, 0)
			if err != nil {
				t.Fatalf("renderVars() error = %v", err)
			}

			for _, want := range tt.wantContains {
				if !strings.Contains(result, want) {
					t.Errorf("renderVars() result should contain %q, got: %s", want, result)
				}
			}

			for _, notWant := range tt.wantNotContain {
				if strings.Contains(result, notWant) {
					t.Errorf("renderVars() result should NOT contain %q, got: %s", notWant, result)
				}
			}
		})
	}
}
