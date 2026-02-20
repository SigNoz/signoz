package querybuilder

import (
	"reflect"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// helper to build a simple key with unspecified context/datatype.
func fk(_ *testing.T, name string) *telemetrytypes.TelemetryFieldKey {
	key := telemetrytypes.GetFieldKeyFromKeyText(name)
	return &key
}

func TestParseFilterExpr_NestedConditions(t *testing.T) {
	tests := []struct {
		name    string
		expr    string
		want    *qbtypes.FilterExprNode
		wantErr bool
	}{
		{
			name: "empty expression returns nil",
			expr: "   ",
			want: qbtypes.NewEmptyFilterExprNode(),
		},
		{
			name:    "invalid expression returns error",
			expr:    "attributes.key =",
			wantErr: true,
		},
		{
			name: "single simple equality leaf",
			expr: "attributes.host.name = 'frontend'",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpLeaf,
				Conditions: []qbtypes.FilterCondition{
					{
						Key:   fk(t, "attributes.host.name"),
						Op:    qbtypes.FilterOperatorEqual,
						Value: "frontend",
					},
				},
			},
		},
		{
			name: "AND with BETWEEN numeric range and NOT boolean comparison",
			expr: "attributes.status_code BETWEEN 500 AND 599 AND NOT attributes.is_error = true",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpAnd,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key: fk(t, "attributes.status_code"),
								Op:  qbtypes.FilterOperatorBetween,
								Value: []any{
									float64(500),
									float64(599),
								},
							},
						},
					},
					{
						Negated: true,
						Op:      qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.is_error"),
								Op:    qbtypes.FilterOperatorEqual,
								Value: true,
							},
						},
					},
				},
			},
		},
		{
			name: "OR with IN list and NOT IN list using different syntaxes",
			expr: "attributes.service.name IN ('api','worker') OR resource.region NOT IN [\"us-east-1\",\"us-west-2\"]",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpOr,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key: fk(t, "attributes.service.name"),
								Op:  qbtypes.FilterOperatorIn,
								Value: []any{
									"api",
									"worker",
								},
							},
						},
					},
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key: fk(t, "resource.region"),
								Op:  qbtypes.FilterOperatorNotIn,
								Value: []any{
									"us-east-1",
									"us-west-2",
								},
							},
						},
					},
				},
			},
		},
		{
			name: "AND chain of string pattern operators with NOT variants",
			expr: "attributes.message LIKE 'error%' AND attributes.message NOT ILIKE '%debug%' AND attributes.message REGEXP 'err[0-9]+' AND attributes.message NOT CONTAINS 'trace'",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpAnd,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.message"),
								Op:    qbtypes.FilterOperatorLike,
								Value: "error%",
							},
						},
					},
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.message"),
								Op:    qbtypes.FilterOperatorNotILike,
								Value: "%debug%",
							},
						},
					},
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.message"),
								Op:    qbtypes.FilterOperatorRegexp,
								Value: "err[0-9]+",
							},
						},
					},
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.message"),
								Op:    qbtypes.FilterOperatorNotContains,
								Value: "trace",
							},
						},
					},
				},
			},
		},
		{
			name: "EXISTS and NOT EXISTS in OR expression",
			expr: "attributes.host EXISTS OR attributes.cluster NOT EXISTS",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpOr,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.host"),
								Op:    qbtypes.FilterOperatorExists,
								Value: nil,
							},
						},
					},
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.cluster"),
								Op:    qbtypes.FilterOperatorNotExists,
								Value: nil,
							},
						},
					},
				},
			},
		},
		{
			name: "KEY used as value in equality",
			expr: "attributes.left = other_key",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpLeaf,
				Conditions: []qbtypes.FilterCondition{
					{
						Key:   fk(t, "attributes.left"),
						Op:    qbtypes.FilterOperatorEqual,
						Value: "other_key",
					},
				},
			},
		},
		{
			name: "nested OR inside AND with NOT on inner group",
			// NOT applies to the whole parenthesized OR group.
			expr: "attributes.env = 'prod' AND NOT (attributes.team = 'core' OR attributes.team = 'platform')",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpAnd,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpLeaf,
						Conditions: []qbtypes.FilterCondition{
							{
								Key:   fk(t, "attributes.env"),
								Op:    qbtypes.FilterOperatorEqual,
								Value: "prod",
							},
						},
					},
					{
						Negated: true,
						Op:      qbtypes.LogicalOpOr,
						Children: []*qbtypes.FilterExprNode{
							{
								Op: qbtypes.LogicalOpLeaf,
								Conditions: []qbtypes.FilterCondition{
									{
										Key:   fk(t, "attributes.team"),
										Op:    qbtypes.FilterOperatorEqual,
										Value: "core",
									},
								},
							},
							{
								Op: qbtypes.LogicalOpLeaf,
								Conditions: []qbtypes.FilterCondition{
									{
										Key:   fk(t, "attributes.team"),
										Op:    qbtypes.FilterOperatorEqual,
										Value: "platform",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "multiple nesting levels mixing AND/OR",
			expr: "(attributes.status = 'critical' OR attributes.status = 'warning') AND (resource.region = 'us-east-1' OR (resource.region = 'us-west-2' AND attributes.tier = 'backend'))",
			want: &qbtypes.FilterExprNode{
				Op: qbtypes.LogicalOpAnd,
				Children: []*qbtypes.FilterExprNode{
					{
						Op: qbtypes.LogicalOpOr,
						Children: []*qbtypes.FilterExprNode{
							{
								Op: qbtypes.LogicalOpLeaf,
								Conditions: []qbtypes.FilterCondition{
									{
										Key:   fk(t, "attributes.status"),
										Op:    qbtypes.FilterOperatorEqual,
										Value: "critical",
									},
								},
							},
							{
								Op: qbtypes.LogicalOpLeaf,
								Conditions: []qbtypes.FilterCondition{
									{
										Key:   fk(t, "attributes.status"),
										Op:    qbtypes.FilterOperatorEqual,
										Value: "warning",
									},
								},
							},
						},
					},
					{
						Op: qbtypes.LogicalOpOr,
						Children: []*qbtypes.FilterExprNode{
							{
								Op: qbtypes.LogicalOpLeaf,
								Conditions: []qbtypes.FilterCondition{
									{
										Key:   fk(t, "resource.region"),
										Op:    qbtypes.FilterOperatorEqual,
										Value: "us-east-1",
									},
								},
							},
							{
								Op: qbtypes.LogicalOpAnd,
								Children: []*qbtypes.FilterExprNode{
									{
										Op: qbtypes.LogicalOpLeaf,
										Conditions: []qbtypes.FilterCondition{
											{
												Key:   fk(t, "resource.region"),
												Op:    qbtypes.FilterOperatorEqual,
												Value: "us-west-2",
											},
										},
									},
									{
										Op: qbtypes.LogicalOpLeaf,
										Conditions: []qbtypes.FilterCondition{
											{
												Key:   fk(t, "attributes.tier"),
												Op:    qbtypes.FilterOperatorEqual,
												Value: "backend",
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name:    "random test",
			expr:    "attributes.status, attributes.status_code = 200",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseFilterExpr(tt.expr)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("unexpected tree for expr %q\n got:  %#v\n want: %#v", tt.expr, got, tt.want)
			}
		})
	}
}
