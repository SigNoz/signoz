package dashboardtypes

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"
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
						"kind": "signoz/DynamicVariable",
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
						"kind": "signoz/TextboxVariable",
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
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
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
				"spec": {"plugin": {"kind": "signoz/NumberPanel", "spec": {}}}
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

func TestRejectUnknownFieldsInPluginSpec(t *testing.T) {
	tests := []struct {
		name        string
		data        string
		wantContain string
	}{
		{
			name: "unknown field in panel spec",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
								"spec": {"bogusField": true}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "bogusField",
		},
		{
			name: "unknown field in query spec",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {
										"kind": "signoz/PromQLQuery",
										"spec": {"name": "A", "query": "up", "unknownThing": 42}
									}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "unknownThing",
		},
		{
			name: "unknown field in variable spec",
			data: `{
				"variables": [{
					"kind": "ListVariable",
					"spec": {
						"name": "v",
						"allowAllValue": false,
						"allowMultiple": false,
						"plugin": {
							"kind": "signoz/DynamicVariable",
							"spec": {"name": "service.name", "signal": "metrics", "extraField": "bad"}
						}
					}
				}],
				"layouts": []
			}`,
			wantContain: "extraField",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := UnmarshalAndValidateDashboardV2JSON([]byte(tt.data))
			if err == nil {
				t.Fatalf("expected error for unknown field, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantContain) {
				t.Fatalf("error should mention %q, got: %v", tt.wantContain, err)
			}
		})
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
								"kind": "signoz/TimeSeriesPanel",
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
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {
										"kind": "signoz/PromQLQuery",
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
							"kind": "signoz/DynamicVariable",
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
								"kind": "signoz/TimeSeriesPanel",
								"spec": {}
							},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {
										"kind": "signoz/BuilderQuery",
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
			name: "bad line interpolation",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
								"spec": {"chartAppearance": {"lineInterpolation": "cubic"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "line interpolation",
		},
		{
			name: "bad line style",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
								"spec": {"chartAppearance": {"lineStyle": "dotted"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "line style",
		},
		{
			name: "bad fill mode",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
								"spec": {"chartAppearance": {"fillMode": "striped"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "fill mode",
		},
		{
			name: "bad spanGaps fillLessThan",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
								"spec": {"chartAppearance": {"spanGaps": {"fillLessThan": "notaduration"}}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "duration",
		},
		{
			name: "bad time preference",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/TimeSeriesPanel",
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
								"kind": "signoz/BarChartPanel",
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
								"kind": "signoz/NumberPanel",
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
								"kind": "signoz/NumberPanel",
								"spec": {"thresholds": [{"value": 100, "operator": "!=", "color": "Red", "format": "text"}]}
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
								"kind": "signoz/TimeSeriesPanel",
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
			data:        wrapVariable("signoz/DynamicVariable", `{"signal": "metrics"}`),
			wantContain: "Name",
		},
		{
			name:        "QueryVariable missing queryValue",
			data:        wrapVariable("signoz/QueryVariable", `{}`),
			wantContain: "QueryValue",
		},
		{
			name:        "CustomVariable missing customValue",
			data:        wrapVariable("signoz/CustomVariable", `{}`),
			wantContain: "CustomValue",
		},
		{
			name:        "ThresholdWithLabel missing value",
			data:        wrapPanel("signoz/TimeSeriesPanel", `{"thresholds": [{"color": "Red", "label": "high"}]}`),
			wantContain: "Value",
		},
		{
			name:        "ThresholdWithLabel missing color",
			data:        wrapPanel("signoz/TimeSeriesPanel", `{"thresholds": [{"value": 100, "label": "high", "color": ""}]}`),
			wantContain: "Color",
		},
		{
			name:        "ThresholdWithLabel missing label",
			data:        wrapPanel("signoz/TimeSeriesPanel", `{"thresholds": [{"value": 100, "color": "Red", "label": ""}]}`),
			wantContain: "Label",
		},
		{
			name:        "ComparisonThreshold missing value",
			data:        wrapPanel("signoz/NumberPanel", `{"thresholds": [{"operator": ">", "format": "text", "color": "Red"}]}`),
			wantContain: "Value",
		},
		{
			name:        "ComparisonThreshold missing color",
			data:        wrapPanel("signoz/NumberPanel", `{"thresholds": [{"value": 100, "operator": ">", "format": "text", "color": ""}]}`),
			wantContain: "Color",
		},
		{
			name:        "TableThreshold missing columnName",
			data:        wrapPanel("signoz/TablePanel", `{"thresholds": [{"value": 100, "operator": ">", "format": "text", "color": "Red", "columnName": ""}]}`),
			wantContain: "ColumnName",
		},
		{
			name:        "SelectField missing name",
			data:        wrapPanel("signoz/ListPanel", `{"selectFields": [{"name": ""}]}`),
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
						"kind": "signoz/TimeSeriesPanel",
						"spec": {}
					}
				}
			}
		},
		"layouts": []
	}`)
	d, err := UnmarshalAndValidateDashboardV2JSON(data)
	if err != nil {
		t.Fatalf("unmarshal and validate failed: %v", err)
	}

	// After validation+normalization, the plugin spec should be a typed struct.
	spec, ok := d.Panels["p1"].Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	if !ok {
		t.Fatalf("expected *TimeSeriesPanelSpec, got %T", d.Panels["p1"].Spec.Plugin.Spec)
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
	if spec.ChartAppearance.SpanGaps.FillOnlyBelow != false {
		t.Fatalf("expected SpanGaps.FillOnlyBelow default false, got %v", spec.ChartAppearance.SpanGaps.FillOnlyBelow)
	}
	if spec.Visualization.TimePreference.Value() != "global_time" {
		t.Fatalf("expected TimePreference default global_time, got %v", spec.Visualization.TimePreference.Value())
	}
	if spec.Legend.Position.Value() != "bottom" {
		t.Fatalf("expected LegendPosition default bottom, got %v", spec.Legend.Position.Value())
	}

	// Re-marshal the full dashboard (what we'd store in DB / return in API response)
	// and verify the output contains the default values.
	output, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal dashboard failed: %v", err)
	}
	outputStr := string(output)
	for field, want := range map[string]string{
		"decimalPrecision":  `"2"`,
		"lineInterpolation": `"spline"`,
		"lineStyle":         `"solid"`,
		"fillMode":          `"solid"`,
		"timePreference":    `"global_time"`,
		"position":          `"bottom"`,
	} {
		if !strings.Contains(outputStr, `"`+field+`":`+want) {
			t.Errorf("expected stored/response JSON to contain %s:%s, got: %s", field, want, outputStr)
		}
	}
}

func TestNumberPanelDefaults(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {
						"kind": "signoz/NumberPanel",
						"spec": {"thresholds": [{"value": 100, "color": "Red"}]}
					}
				}
			}
		},
		"layouts": []
	}`)
	d, err := UnmarshalAndValidateDashboardV2JSON(data)
	if err != nil {
		t.Fatalf("unmarshal and validate failed: %v", err)
	}

	spec, ok := d.Panels["p1"].Spec.Plugin.Spec.(*NumberPanelSpec)
	if !ok {
		t.Fatalf("expected *NumberPanelSpec, got %T", d.Panels["p1"].Spec.Plugin.Spec)
	}

	if len(spec.Thresholds) != 1 {
		t.Fatalf("expected 1 threshold, got %d", len(spec.Thresholds))
	}
	if spec.Thresholds[0].Operator.Value() != ">" {
		t.Fatalf("expected ComparisonOperator default >, got %v", spec.Thresholds[0].Operator.Value())
	}
	if spec.Thresholds[0].Format.Value() != "text" {
		t.Fatalf("expected ThresholdFormat default text, got %v", spec.Thresholds[0].Format.Value())
	}

	// Marshal back and verify defaults in JSON output.
	output, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal dashboard failed: %v", err)
	}
	outputStr := string(output)
	if !strings.Contains(outputStr, `"format":"text"`) {
		t.Errorf("expected stored/response JSON to contain format:text, got: %s", outputStr)
	}
	// Go's json.Marshal escapes ">" as "\u003e", so check for both forms.
	if !strings.Contains(outputStr, `"operator":">"`) && !strings.Contains(outputStr, `"operator":"\u003e"`) {
		t.Errorf("expected stored/response JSON to contain operator:>, got: %s", outputStr)
	}
}

func TestSpanGaps(t *testing.T) {
	unmarshal := func(val string) (SpanGaps, error) {
		var sg SpanGaps
		err := json.Unmarshal([]byte(val), &sg)
		return sg, err
	}

	t.Run("defaults", func(t *testing.T) {
		var sg SpanGaps
		if sg.FillOnlyBelow != false {
			t.Fatalf("expected FillOnlyBelow default false, got %v", sg.FillOnlyBelow)
		}
		if !sg.FillLessThan.IsZero() {
			t.Fatalf("expected FillLessThan default zero, got %v", sg.FillLessThan)
		}
	})

	t.Run("fillOnlyBelow true", func(t *testing.T) {
		sg, err := unmarshal(`{"fillOnlyBelow": true}`)
		if err != nil {
			t.Fatal(err)
		}
		if !sg.FillOnlyBelow {
			t.Fatalf("expected FillOnlyBelow true, got false")
		}
	})

	t.Run("fillLessThan duration", func(t *testing.T) {
		sg, err := unmarshal(`{"fillOnlyBelow": false, "fillLessThan": "5m"}`)
		if err != nil {
			t.Fatal(err)
		}
		if sg.FillOnlyBelow {
			t.Fatalf("expected FillOnlyBelow false, got true")
		}
		if sg.FillLessThan.Duration() != 5*time.Minute {
			t.Fatalf("expected FillLessThan 5m, got %v", sg.FillLessThan.Duration())
		}
	})

	t.Run("fillLessThan compound duration", func(t *testing.T) {
		sg, err := unmarshal(`{"fillLessThan": "1h30m"}`)
		if err != nil {
			t.Fatal(err)
		}
		if sg.FillLessThan.Duration() != 90*time.Minute {
			t.Fatalf("expected FillLessThan 1h30m, got %v", sg.FillLessThan.Duration())
		}
	})
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
				"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/CompositeQuery", "spec": {
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
		{"TimeSeries+PromQL", mkQuery("signoz/TimeSeriesPanel", "signoz/PromQLQuery", `{"name":"A","query":"up"}`), false},
		{"Table+ClickHouse", mkQuery("signoz/TablePanel", "signoz/ClickHouseSQL", `{"name":"A","query":"SELECT 1"}`), false},
		{"List+Builder", mkQuery("signoz/ListPanel", "signoz/BuilderQuery", `{"name":"A","signal":"logs"}`), false},
		// Top-level: rejected
		{"Table+PromQL", mkQuery("signoz/TablePanel", "signoz/PromQLQuery", `{"name":"A","query":"up"}`), true},
		{"List+ClickHouse", mkQuery("signoz/ListPanel", "signoz/ClickHouseSQL", `{"name":"A","query":"SELECT 1"}`), true},
		{"List+PromQL", mkQuery("signoz/ListPanel", "signoz/PromQLQuery", `{"name":"A","query":"up"}`), true},
		{"List+Composite", mkQuery("signoz/ListPanel", "signoz/CompositeQuery", `{"queries":[]}`), true},
		{"List+Formula", mkQuery("signoz/ListPanel", "signoz/Formula", `{"name":"F1","expression":"A+B"}`), true},
		// Composite sub-queries
		{"Table+Composite(promql)", mkComposite("signoz/TablePanel", "promql", `{"name":"A","query":"up"}`), true},
		{"Table+Composite(clickhouse)", mkComposite("signoz/TablePanel", "clickhouse_sql", `{"name":"A","query":"SELECT 1"}`), false},
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
