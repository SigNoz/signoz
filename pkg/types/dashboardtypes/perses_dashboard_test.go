package dashboardtypes

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func unmarshalDashboard(data []byte) (*DashboardData, error) {
	var d DashboardData
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

func TestValidateBigExample(t *testing.T) {
	data, err := os.ReadFile("testdata/perses.json")
	require.NoError(t, err, "reading example file")
	_, err = unmarshalDashboard(data)
	require.NoError(t, err, "expected valid dashboard")
}

func TestValidateDashboardWithSections(t *testing.T) {
	data, err := os.ReadFile("testdata/perses_with_sections.json")
	require.NoError(t, err, "reading example file")
	_, err = unmarshalDashboard(data)
	require.NoError(t, err, "expected valid dashboard")
}

func TestInvalidateNotAJSON(t *testing.T) {
	_, err := unmarshalDashboard([]byte("not json"))
	require.Error(t, err, "expected error for invalid JSON")
}

// TestUnmarshalErrorPreservesNestedMessage guards the wrap on dec.Decode in
// DashboardData.UnmarshalJSON. The wrap stamps a consistent type/code on
// decode failures, but must not smother the rich messages produced by nested
// UnmarshalJSON methods (panel/query/variable/datasource plugin envelopes).
func TestUnmarshalErrorPreservesNestedMessage(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "NonExistentPanel", "spec": {}}
				}
			}
		},
		"layouts": []
	}`)

	_, err := unmarshalDashboard(data)
	require.Error(t, err)

	require.Contains(t, err.Error(), "unknown panel plugin kind",
		"outer wrap should not smother the inner UnmarshalJSON message")
	require.Contains(t, err.Error(), `"NonExistentPanel"`,
		"the offending value should still appear in the error")
	require.Contains(t, err.Error(), "allowed values:",
		"the allowed-values hint should still appear in the error")

	assert.True(t, errors.Ast(err, errors.TypeInvalidInput),
		"outer wrap should classify the error as TypeInvalidInput")
	assert.True(t, errors.Asc(err, ErrCodeDashboardInvalidInput),
		"outer wrap should stamp ErrCodeDashboardInvalidInput")
}

func TestValidateEmptySpec(t *testing.T) {
	// no variables no panels
	data := []byte(`{}`)
	_, err := unmarshalDashboard(data)
	require.NoError(t, err, "expected valid")
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
					"value": "default"
				}
			}
		],
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.NoError(t, err, "expected valid")
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
			_, err := unmarshalDashboard([]byte(tt.data))
			require.Error(t, err, "expected error containing %q, got nil", tt.wantContain)
			require.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected error for invalid panel plugin kind")
	require.Contains(t, err.Error(), "FakePanel", "error should mention FakePanel")
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
			_, err := unmarshalDashboard([]byte(tt.data))
			require.Error(t, err, "expected error for unknown field")
			require.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
			_, err := unmarshalDashboard([]byte(tt.data))
			require.Error(t, err, "expected validation error")
			if tt.wantContain != "" {
				require.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
			_, err := unmarshalDashboard([]byte(tt.data))
			require.Error(t, err, "expected error containing %q, got nil", tt.wantContain)
			require.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
		})
	}
}

func TestInvalidatePanelWithoutQueries(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}}}
			}
		},
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected panel-without-queries to be rejected")
	require.Contains(t, err.Error(), "panel must have one query")
}

func TestInvalidatePanelWithEmptyQueriesArray(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
					"queries": []
				}
			}
		},
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected panel with explicit empty queries array to be rejected")
	require.Contains(t, err.Error(), "panel must have one query")
}

// Rendering multiple data sources in a single panel is supported via
// signoz/CompositeQuery, not by listing multiple top-level queries.
func TestInvalidatePanelWithMultipleDirectQueries(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
					"queries": [
						{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "metrics"}}}},
						{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "B", "signal": "metrics"}}}}
					]
				}
			}
		},
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected panel with two top-level queries to be rejected")
	require.Contains(t, err.Error(), "panel must have one query")
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
			_, err := unmarshalDashboard([]byte(tt.data))
			require.Error(t, err, "expected error containing %q, got nil", tt.wantContain)
			require.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
					},
					"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			}
		},
		"layouts": []
	}`)
	d, err := unmarshalDashboard(data)
	require.NoError(t, err, "unmarshal and validate failed")

	// After validation+normalization, the plugin spec should be a typed struct.
	require.IsType(t, &TimeSeriesPanelSpec{}, d.Panels["p1"].Spec.Plugin.Spec)
	spec := d.Panels["p1"].Spec.Plugin.Spec.(*TimeSeriesPanelSpec)

	require.Equal(t, "2", spec.Formatting.DecimalPrecision.ValueOrDefault(), "expected DecimalPrecision default 2")
	require.Equal(t, "spline", spec.ChartAppearance.LineInterpolation.ValueOrDefault(), "expected LineInterpolation default spline")
	require.Equal(t, "solid", spec.ChartAppearance.LineStyle.ValueOrDefault(), "expected LineStyle default solid")
	require.Equal(t, "solid", spec.ChartAppearance.FillMode.ValueOrDefault(), "expected FillMode default solid")
	require.False(t, spec.ChartAppearance.SpanGaps.FillOnlyBelow, "expected SpanGaps.FillOnlyBelow default false")
	require.Equal(t, "global_time", spec.Visualization.TimePreference.ValueOrDefault(), "expected TimePreference default global_time")
	require.Equal(t, "bottom", spec.Legend.Position.ValueOrDefault(), "expected LegendPosition default bottom")

	// Re-marshal the full dashboard (what we'd store in DB / return in API response)
	// and verify the output contains the default values.
	output, err := json.Marshal(d)
	require.NoError(t, err, "marshal dashboard failed")
	outputStr := string(output)
	for field, want := range map[string]string{
		"decimalPrecision":  `"2"`,
		"lineInterpolation": `"spline"`,
		"lineStyle":         `"solid"`,
		"fillMode":          `"solid"`,
		"timePreference":    `"global_time"`,
		"position":          `"bottom"`,
	} {
		assert.Contains(t, outputStr, `"`+field+`":`+want, "expected stored/response JSON to contain %s:%s", field, want)
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
					},
					"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			}
		},
		"layouts": []
	}`)
	d, err := unmarshalDashboard(data)
	require.NoError(t, err, "unmarshal and validate failed")

	require.IsType(t, &NumberPanelSpec{}, d.Panels["p1"].Spec.Plugin.Spec)
	spec := d.Panels["p1"].Spec.Plugin.Spec.(*NumberPanelSpec)

	require.Len(t, spec.Thresholds, 1, "expected 1 threshold")
	require.Equal(t, ">", spec.Thresholds[0].Operator.ValueOrDefault(), "expected ComparisonOperator default >")
	require.Equal(t, "text", spec.Thresholds[0].Format.ValueOrDefault(), "expected ThresholdFormat default text")

	// Marshal back and verify defaults in JSON output.
	output, err := json.Marshal(d)
	require.NoError(t, err, "marshal dashboard failed")
	outputStr := string(output)
	assert.Contains(t, outputStr, `"format":"text"`, "expected stored/response JSON to contain format:text")
	// Go's json.Marshal escapes ">" as "\u003e", so check for both forms.
	assert.True(t,
		strings.Contains(outputStr, `"operator":">"`) || strings.Contains(outputStr, `"operator":"\u003e"`),
		"expected stored/response JSON to contain operator:>, got: %s", outputStr)
}

// TestPersesFixtureStorageRoundTrip exercises the typed → map[string]any →
// typed cycle that the create/get path performs against the kitchen-sink
// fixture. Catches plugin specs whose UnmarshalJSON expects a different shape
// than the default MarshalJSON emits.
func TestPersesFixtureStorageRoundTrip(t *testing.T) {
	raw, err := os.ReadFile("testdata/perses.json")
	require.NoError(t, err)

	var data DashboardData
	require.NoError(t, json.Unmarshal(raw, &data), "initial unmarshal")

	marshaled, err := json.Marshal(data)
	require.NoError(t, err, "marshal typed → JSON")

	var asMap map[string]any
	require.NoError(t, json.Unmarshal(marshaled, &asMap), "JSON → map (storage shape)")

	remarshaled, err := json.Marshal(asMap)
	require.NoError(t, err, "map → JSON (read-back shape)")

	var roundtripped DashboardData
	require.NoError(t, json.Unmarshal(remarshaled, &roundtripped), "JSON → typed (the failure mode)")
}

// TestStorageRoundTrip simulates the future DB store/load cycle:
// marshal the normalized dashboard to JSON (what would be written to DB),
// then unmarshal it back (what would be read from DB), and verify defaults survive.
func TestStorageRoundTrip(t *testing.T) {
	input := []byte(`{
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {
						"kind": "signoz/TimeSeriesPanel",
						"spec": {}
					},
					"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			},
			"p2": {
				"kind": "Panel",
				"spec": {
					"plugin": {
						"kind": "signoz/NumberPanel",
						"spec": {"thresholds": [{"value": 100, "color": "Red"}]}
					},
					"queries": [{"kind": "TimeSeriesQuery", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			}
		},
		"layouts": []
	}`)

	// Step 1: Unmarshal + validate + normalize (what the API handler does).
	d, err := unmarshalDashboard(input)
	require.NoError(t, err, "unmarshal and validate failed")

	// Step 1.5: Verify struct fields have correct defaults (extra validation before storing).
	tsSpec := d.Panels["p1"].Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	assert.Equal(t, "2", tsSpec.Formatting.DecimalPrecision.ValueOrDefault())
	assert.Equal(t, "spline", tsSpec.ChartAppearance.LineInterpolation.ValueOrDefault())
	assert.Equal(t, "solid", tsSpec.ChartAppearance.LineStyle.ValueOrDefault())
	assert.Equal(t, "solid", tsSpec.ChartAppearance.FillMode.ValueOrDefault())
	assert.Equal(t, "global_time", tsSpec.Visualization.TimePreference.ValueOrDefault())
	assert.Equal(t, "bottom", tsSpec.Legend.Position.ValueOrDefault())
	numSpec := d.Panels["p2"].Spec.Plugin.Spec.(*NumberPanelSpec)
	assert.Equal(t, ">", numSpec.Thresholds[0].Operator.ValueOrDefault())
	assert.Equal(t, "text", numSpec.Thresholds[0].Format.ValueOrDefault())

	// Step 2: Marshal to JSON (simulates writing to DB).
	stored, err := json.Marshal(d)
	require.NoError(t, err, "marshal for storage failed")

	// Step 3: Unmarshal from JSON (simulates reading from DB).
	loaded, err := unmarshalDashboard(stored)
	require.NoError(t, err, "unmarshal from storage failed")

	// Step 3.5: Verify struct fields have correct defaults after loading (before returning in API).
	tsLoaded := loaded.Panels["p1"].Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	assert.Equal(t, "2", tsLoaded.Formatting.DecimalPrecision.ValueOrDefault(), "after load")
	assert.Equal(t, "spline", tsLoaded.ChartAppearance.LineInterpolation.ValueOrDefault(), "after load")
	assert.Equal(t, "solid", tsLoaded.ChartAppearance.LineStyle.ValueOrDefault(), "after load")
	assert.Equal(t, "solid", tsLoaded.ChartAppearance.FillMode.ValueOrDefault(), "after load")
	assert.Equal(t, "global_time", tsLoaded.Visualization.TimePreference.ValueOrDefault(), "after load")
	assert.Equal(t, "bottom", tsLoaded.Legend.Position.ValueOrDefault(), "after load")
	numLoaded := loaded.Panels["p2"].Spec.Plugin.Spec.(*NumberPanelSpec)
	assert.Equal(t, ">", numLoaded.Thresholds[0].Operator.ValueOrDefault(), "after load")
	assert.Equal(t, "text", numLoaded.Thresholds[0].Format.ValueOrDefault(), "after load")

	// Step 4: Marshal again (simulates API response) and verify defaults.
	response, err := json.Marshal(loaded)
	require.NoError(t, err, "marshal for response failed")
	responseStr := string(response)

	for field, want := range map[string]string{
		"decimalPrecision":  `"2"`,
		"lineInterpolation": `"spline"`,
		"lineStyle":         `"solid"`,
		"fillMode":          `"solid"`,
		"timePreference":    `"global_time"`,
		"position":          `"bottom"`,
		"format":            `"text"`,
	} {
		assert.Contains(t, responseStr, `"`+field+`":`+want, "expected %s:%s after storage round-trip", field, want)
	}

	// Verify operator default (Go escapes ">" as "\u003e").
	assert.True(t,
		strings.Contains(responseStr, `"operator":">"`) || strings.Contains(responseStr, `"operator":"\u003e"`),
		"expected operator:> after storage round-trip")
}

func TestSpanGaps(t *testing.T) {
	unmarshal := func(t *testing.T, val string) SpanGaps {
		t.Helper()
		var sg SpanGaps
		require.NoError(t, json.Unmarshal([]byte(val), &sg))
		return sg
	}

	t.Run("defaults", func(t *testing.T) {
		var sg SpanGaps
		assert.False(t, sg.FillOnlyBelow, "expected FillOnlyBelow default false")
		assert.True(t, sg.FillLessThan.IsZero(), "expected FillLessThan default zero")
	})

	t.Run("fillOnlyBelow true", func(t *testing.T) {
		sg := unmarshal(t, `{"fillOnlyBelow": true}`)
		assert.True(t, sg.FillOnlyBelow)
	})

	t.Run("fillLessThan duration", func(t *testing.T) {
		sg := unmarshal(t, `{"fillOnlyBelow": false, "fillLessThan": "5m"}`)
		assert.False(t, sg.FillOnlyBelow)
		assert.Equal(t, 5*time.Minute, sg.FillLessThan.Duration())
	})

	t.Run("fillLessThan compound duration", func(t *testing.T) {
		sg := unmarshal(t, `{"fillLessThan": "1h30m"}`)
		assert.Equal(t, 90*time.Minute, sg.FillLessThan.Duration())
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
		t.Run(tc.name, func(t *testing.T) {
			_, err := unmarshalDashboard(tc.data)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
