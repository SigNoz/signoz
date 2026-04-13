package dashboardtypes

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestValidateBigExample(t *testing.T) {
	data, err := os.ReadFile("testdata/perses.json")
	if err != nil {
		t.Fatalf("reading example file: %v", err)
	}
	if _, err := UnmarshalAndValidateDashboardV2JSON(data); err != nil {
		t.Fatalf("expected valid dashboard, got error: %v", err)
	}
}

func TestValidateDashboardWithSections(t *testing.T) {
	data, err := os.ReadFile("testdata/perses_with_sections.json")
	if err != nil {
		t.Fatalf("reading example file: %v", err)
	}
	if _, err := UnmarshalAndValidateDashboardV2JSON(data); err != nil {
		t.Fatalf("expected valid dashboard, got error: %v", err)
	}
}

func TestInvalidateNotAJSON(t *testing.T) {
	if _, err := UnmarshalAndValidateDashboardV2JSON([]byte("not json")); err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestValidateEmptySpec(t *testing.T) {
	// no variables no panels
	data := []byte(`{}`)
	if _, err := UnmarshalAndValidateDashboardV2JSON(data); err != nil {
		t.Fatalf("expected valid, got: %v", err)
	}
}

func TestValidateOnlyVariables(t *testing.T) {
	data := []byte(`{
		"variables": [
			{
				"kind": "ListVariable",
				"spec": {
					"name": "service",
					"allowAllValue": true,
					"allowMultiple": false,
					"plugin": {
						"kind": "signozdynamicvariable",
						"spec": {
							"name": "service.name",
							"signal": "metrics"
						}
					}
				}
			},
			{
				"kind": "TextVariable",
				"spec": {
					"name": "mytext",
					"value": "default",
					"plugin": {
						"kind": "signoztextboxvariable",
						"spec": {}
					}
				}
			}
		],
		"layouts": []
	}`)
	if _, err := UnmarshalAndValidateDashboardV2JSON(data); err != nil {
		t.Fatalf("expected valid, got: %v", err)
	}
}

func TestInvalidateUnknownPluginKind(t *testing.T) {
	tests := []struct {
		name        string
		data        string
		wantContain string
	}{
		{
			name: "unknown panel plugin",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "NonExistentPanel", "spec": {}}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "NonExistentPanel",
		},
		{
			name: "unknown query plugin",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoztimeseriespanel", "spec": {}},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {"kind": "FakeQueryPlugin", "spec": {}}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "FakeQueryPlugin",
		},
		{
			name: "unknown variable plugin",
			data: `{
				"variables": [{
					"kind": "ListVariable",
					"spec": {
						"name": "v1",
						"allowAllValue": false,
						"allowMultiple": false,
						"plugin": {"kind": "FakeVariable", "spec": {}}
					}
				}],
				"layouts": []
			}`,
			wantContain: "FakeVariable",
		},
		{
			name: "unknown datasource plugin",
			data: `{
				"datasources": {
					"ds1": {
						"default": true,
						"plugin": {"kind": "FakeDatasource", "spec": {}}
					}
				},
				"layouts": []
			}`,
			wantContain: "FakeDatasource",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := UnmarshalAndValidateDashboardV2JSON([]byte(tt.data))
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantContain)
			}
			if !strings.Contains(err.Error(), tt.wantContain) {
				t.Fatalf("error should mention %q, got: %v", tt.wantContain, err)
			}
		})
	}
}

func TestInvalidateOneInvalidPanel(t *testing.T) {
	data := []byte(`{
		"panels": {
			"good": {
				"kind": "Panel",
				"spec": {"plugin": {"kind": "signoznumberpanel", "spec": {}}}
			},
			"bad": {
				"kind": "Panel",
				"spec": {"plugin": {"kind": "FakePanel", "spec": {}}}
			}
		},
		"layouts": []
	}`)
	_, err := UnmarshalAndValidateDashboardV2JSON(data)
	if err == nil {
		t.Fatal("expected error for invalid panel plugin kind")
	}
	if !strings.Contains(err.Error(), "FakePanel") {
		t.Fatalf("error should mention FakePanel, got: %v", err)
	}
}

func TestInvalidateWrongFieldTypeInPluginSpec(t *testing.T) {
	tests := []struct {
		name        string
		data        string
		wantContain string
	}{
		{
			name: "wrong type on panel plugin field",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoztimeseriespanel",
								"spec": {"visualization": {"fillSpans": "notabool"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "fillSpans",
		},
		{
			name: "wrong type on query plugin field",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoztimeseriespanel", "spec": {}},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {
										"kind": "signozpromqlquery",
										"spec": {"name": "A", "query": 123}
									}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "",
		},
		{
			name: "wrong type on variable plugin field",
			data: `{
				"variables": [{
					"kind": "ListVariable",
					"spec": {
						"name": "v",
						"allowAllValue": false,
						"allowMultiple": false,
						"plugin": {
							"kind": "signozdynamicvariable",
							"spec": {"name": 123, "signal": "metrics"}
						}
					}
				}],
				"layouts": []
			}`,
			wantContain: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := UnmarshalAndValidateDashboardV2JSON([]byte(tt.data))
			if err == nil {
				t.Fatal("expected validation error")
			}
			if tt.wantContain != "" && !strings.Contains(err.Error(), tt.wantContain) {
				t.Fatalf("error should mention %q, got: %v", tt.wantContain, err)
			}
		})
	}
}

func TestInvalidateBadPanelSpecValues(t *testing.T) {
	tests := []struct {
		name        string
		data        string
		wantContain string
	}{
		{
			name: "bad signal in builder query",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoztimeseriespanel",
								"spec": {}
							},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {
										"kind": "signozbuilderquery",
										"spec": {"signal": "foo"}
									}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "signal",
		},
		{
			name: "bad time preference",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoztimeseriespanel",
								"spec": {"visualization": {"timePreference": "last2Hr"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "timePreference",
		},
		{
			name: "bad legend position",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signozbarchartpanel",
								"spec": {"legend": {"position": "top"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "legend position",
		},
		{
			name: "bad threshold format",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoznumberpanel",
								"spec": {"thresholds": [{"value": 100, "operator": ">", "color": "Red", "format": "Color"}]}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "threshold format",
		},
		{
			name: "bad comparison operator",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoznumberpanel",
								"spec": {"thresholds": [{"value": 100, "operator": "!=", "color": "Red", "format": "Text"}]}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "comparison operator",
		},
		{
			name: "bad precision",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoztimeseriespanel",
								"spec": {"formatting": {"decimalPrecision": "9"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "precision",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := UnmarshalAndValidateDashboardV2JSON([]byte(tt.data))
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantContain)
			}
			if !strings.Contains(err.Error(), tt.wantContain) {
				t.Fatalf("error should mention %q, got: %v", tt.wantContain, err)
			}
		})
	}
}

func TestValidateRequiredFields(t *testing.T) {
	wrapVariable := func(pluginKind, pluginSpec string) string {
		return `{
			"variables": [{
				"kind": "ListVariable",
				"spec": {
					"name": "v",
					"allowAllValue": false,
					"allowMultiple": false,
					"plugin": {"kind": "` + pluginKind + `", "spec": ` + pluginSpec + `}
				}
			}],
			"layouts": []
		}`
	}
	wrapPanel := func(panelKind, panelSpec string) string {
		return `{
			"panels": {
				"p1": {
					"kind": "Panel",
					"spec": {
						"plugin": {"kind": "` + panelKind + `", "spec": ` + panelSpec + `}
					}
				}
			},
			"layouts": []
		}`
	}

	tests := []struct {
		name        string
		data        string
		wantContain string
	}{
		{
			name:        "DynamicVariable missing name",
			data:        wrapVariable("signozdynamicvariable", `{"signal": "metrics"}`),
			wantContain: "Name",
		},
		{
			name:        "QueryVariable missing queryValue",
			data:        wrapVariable("signozqueryvariable", `{}`),
			wantContain: "QueryValue",
		},
		{
			name:        "CustomVariable missing customValue",
			data:        wrapVariable("signozcustomvariable", `{}`),
			wantContain: "CustomValue",
		},
		{
			name:        "ThresholdWithLabel missing value",
			data:        wrapPanel("signoztimeseriespanel", `{"thresholds": [{"color": "Red", "label": "high"}]}`),
			wantContain: "Value",
		},
		{
			name:        "ThresholdWithLabel missing color",
			data:        wrapPanel("signoztimeseriespanel", `{"thresholds": [{"value": 100, "label": "high", "color": ""}]}`),
			wantContain: "Color",
		},
		{
			name:        "ThresholdWithLabel missing label",
			data:        wrapPanel("signoztimeseriespanel", `{"thresholds": [{"value": 100, "color": "Red", "label": ""}]}`),
			wantContain: "Label",
		},
		{
			name:        "ComparisonThreshold missing value",
			data:        wrapPanel("signoznumberpanel", `{"thresholds": [{"operator": ">", "format": "Text", "color": "Red"}]}`),
			wantContain: "Value",
		},
		{
			name:        "ComparisonThreshold missing operator",
			data:        wrapPanel("signoznumberpanel", `{"thresholds": [{"value": 100, "format": "Text", "color": "Red"}]}`),
			wantContain: "Operator",
		},
		{
			name:        "ComparisonThreshold missing color",
			data:        wrapPanel("signoznumberpanel", `{"thresholds": [{"value": 100, "operator": ">", "format": "Text", "color": ""}]}`),
			wantContain: "Color",
		},
		{
			name:        "TableThreshold missing columnName",
			data:        wrapPanel("signoztablepanel", `{"thresholds": [{"value": 100, "operator": ">", "format": "Text", "color": "Red", "columnName": ""}]}`),
			wantContain: "ColumnName",
		},
		{
			name:        "SelectField missing name",
			data:        wrapPanel("signozlistpanel", `{"selectFields": [{"name": ""}]}`),
			wantContain: "Name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := UnmarshalAndValidateDashboardV2JSON([]byte(tt.data))
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantContain)
			}
			if !strings.Contains(err.Error(), tt.wantContain) {
				t.Fatalf("error should mention %q, got: %v", tt.wantContain, err)
			}
		})
	}
}

func TestTimeSeriesPanelDefaults(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {
						"kind": "signoztimeseriespanel",
						"spec": {}
					}
				}
			}
		},
		"layouts": []
	}`)
	var d StorableDashboardDataV2
	if err := json.Unmarshal(data, &d); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	specJSON, _ := json.Marshal(d.Panels["p1"].Spec.Plugin.Spec)
	var spec TimeSeriesPanelSpec
	if err := json.Unmarshal(specJSON, &spec); err != nil {
		t.Fatalf("unmarshal spec failed: %v", err)
	}

	if spec.Formatting.DecimalPrecision.Value() != "2" {
		t.Fatalf("expected DecimalPrecision default 2, got %v", spec.Formatting.DecimalPrecision.Value())
	}
	if spec.ChartAppearance.LineInterpolation.Value() != "spline" {
		t.Fatalf("expected LineInterpolation default spline, got %v", spec.ChartAppearance.LineInterpolation.Value())
	}
	if spec.ChartAppearance.LineStyle.Value() != "solid" {
		t.Fatalf("expected LineStyle default solid, got %v", spec.ChartAppearance.LineStyle.Value())
	}
	if spec.ChartAppearance.FillMode.Value() != "solid" {
		t.Fatalf("expected FillMode default solid, got %v", spec.ChartAppearance.FillMode.Value())
	}
	if spec.ChartAppearance.SpanGaps.Value() != true {
		t.Fatalf("expected SpanGaps default true, got %v", spec.ChartAppearance.SpanGaps.Value())
	}
}

func TestPanelTypeQueryTypeCompatibility(t *testing.T) {
	mkQuery := func(panelKind, queryKind, querySpec string) []byte {
		return []byte(`{
			"panels": {"p1": {"kind": "Panel", "spec": {
				"plugin": {"kind": "` + panelKind + `", "spec": {}},
				"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "` + queryKind + `", "spec": ` + querySpec + `}}}]
			}}},
			"layouts": []
		}`)
	}
	mkComposite := func(panelKind, subType, subSpec string) []byte {
		return []byte(`{
			"panels": {"p1": {"kind": "Panel", "spec": {
				"plugin": {"kind": "` + panelKind + `", "spec": {}},
				"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signozcompositequery", "spec": {
					"queries": [{"type": "` + subType + `", "spec": ` + subSpec + `}]
				}}}}]
			}}},
			"layouts": []
		}`)
	}

	cases := []struct {
		name    string
		data    []byte
		wantErr bool
	}{
		// Top-level: allowed
		{"TimeSeries+PromQL", mkQuery("signoztimeseriespanel", "signozpromqlquery", `{"name":"A","query":"up"}`), false},
		{"Table+ClickHouse", mkQuery("signoztablepanel", "signozclickhousesql", `{"name":"A","query":"SELECT 1"}`), false},
		{"List+Builder", mkQuery("signozlistpanel", "signozbuilderquery", `{"name":"A","signal":"logs"}`), false},
		// Top-level: rejected
		{"Table+PromQL", mkQuery("signoztablepanel", "signozpromqlquery", `{"name":"A","query":"up"}`), true},
		{"List+ClickHouse", mkQuery("signozlistpanel", "signozclickhousesql", `{"name":"A","query":"SELECT 1"}`), true},
		{"List+PromQL", mkQuery("signozlistpanel", "signozpromqlquery", `{"name":"A","query":"up"}`), true},
		{"List+Composite", mkQuery("signozlistpanel", "signozcompositequery", `{"queries":[]}`), true},
		{"List+Formula", mkQuery("signozlistpanel", "signozformula", `{"name":"F1","expression":"A+B"}`), true},
		// Composite sub-queries
		{"Table+Composite(promql)", mkComposite("signoztablepanel", "promql", `{"name":"A","query":"up"}`), true},
		{"Table+Composite(clickhouse)", mkComposite("signoztablepanel", "clickhouse_sql", `{"name":"A","query":"SELECT 1"}`), false},
	}

	for _, tc := range cases {
		_, err := UnmarshalAndValidateDashboardV2JSON(tc.data)
		if tc.wantErr && err == nil {
			t.Fatalf("%s: expected error, got nil", tc.name)
		}
		if !tc.wantErr && err != nil {
			t.Fatalf("%s: expected valid, got: %v", tc.name, err)
		}
	}
}
