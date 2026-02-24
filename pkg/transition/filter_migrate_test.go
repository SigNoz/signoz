package transition

import (
	"context"
	"log/slog"
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

func TestBuildFilterExpressionFromFilterSet(t *testing.T) {
	ctx := context.Background()
	logger := slog.Default()

	tests := []struct {
		name         string
		dataSource   string
		filterSet    *v3.FilterSet
		wantExpr     string
		wantMigrated bool
		wantErr      bool
	}{
		{
			name:         "empty filter JSON",
			dataSource:   "logs",
			filterSet:    &v3.FilterSet{},
			wantExpr:     "",
			wantMigrated: false,
			wantErr:      false,
		},
		{
			name:         "empty items array",
			dataSource:   "logs",
			filterSet:    &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			wantExpr:     "",
			wantMigrated: false,
			wantErr:      false,
		},
		{
			name:       "multiple filter items with AND operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key:      v3.AttributeKey{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						Operator: v3.FilterOperatorEqual,
						Value:    "GET",
					},
					{
						Key:      v3.AttributeKey{Key: "environment", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
						Operator: v3.FilterOperatorEqual,
						Value:    "prod",
					},
				},
			},
			wantExpr:     `(attribute.http.method = 'GET' AND resource.environment = 'prod')`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "multiple filter items with OR operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "OR",
				Items: []v3.FilterItem{
					{
						Key:      v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						Operator: v3.FilterOperatorEqual,
						Value:    "error",
					},
					{
						Key:      v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						Operator: v3.FilterOperatorEqual,
						Value:    "warn",
					},
				},
			},
			wantExpr:     `(attribute.level = 'error' OR attribute.level = 'warn')`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "in operator with array value",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					Operator: v3.FilterOperatorIn,
					Value:    []string{"api", "web", "worker"},
				}},
			},
			wantExpr:     `attribute.service.name IN ['api', 'web', 'worker']`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "contains operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "message", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					Operator: v3.FilterOperatorContains,
					Value:    "error",
				}},
			},
			wantExpr:     `attribute.message CONTAINS 'error'`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "not exists operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "trace.id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
					Operator: v3.FilterOperatorNotExists,
					Value:    nil,
				}},
			},
			wantExpr:     `attribute.trace.id NOT EXISTS`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "regex operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "body"},
					Operator: v3.FilterOperatorRegex,
					Value:    ".*",
				}},
			},
			wantExpr:     `body REGEXP '.*'`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "has operator",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "tags", DataType: v3.AttributeKeyDataTypeArrayString, Type: v3.AttributeKeyTypeTag},
					Operator: v3.FilterOperatorHas,
					Value:    "production",
				}},
			},
			wantExpr:     `has(attribute.tags, 'production')`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "complex filter with multiple operators",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key:      v3.AttributeKey{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
						Operator: v3.FilterOperatorEqual,
						Value:    "POST",
					},
					{
						Key:      v3.AttributeKey{Key: "http.status_code", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag},
						Operator: v3.FilterOperatorGreaterThanOrEq,
						Value:    float64(400),
					},
					{
						Key:      v3.AttributeKey{Key: "resource.env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
						Operator: v3.FilterOperatorEqual,
						Value:    "prod",
					},
				},
			},
			wantExpr:     `(attribute.http.method = 'POST' AND attribute.http.status_code >= 400 AND resource.resource.env = 'prod')`,
			wantMigrated: true,
			wantErr:      false,
		},
		{
			name:       "filter with resource type (non-ambiguous key)",
			dataSource: "logs",
			filterSet: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{{
					Key:      v3.AttributeKey{Key: "service.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
					Operator: v3.FilterOperatorEqual,
					Value:    "frontend",
				}},
			},
			wantExpr:     `resource.service.name = 'frontend'`,
			wantMigrated: true,
			wantErr:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expr, migrated, err := BuildFilterExpressionFromFilterSet(ctx, logger, tt.dataSource, tt.filterSet)

			if (err != nil) != tt.wantErr {
				t.Errorf("BuildFilterExpressionFromFilterSet() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if migrated != tt.wantMigrated {
				t.Errorf("BuildFilterExpressionFromFilterSet() migrated = %v, want %v", migrated, tt.wantMigrated)
			}

			if expr != tt.wantExpr {
				t.Errorf("BuildFilterExpressionFromFilterSet() expression = %v, want %v", expr, tt.wantExpr)
			}
		})
	}
}
