package dashboardtypes

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/perses/spec/go/dashboard"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/util/validation"
)

func unmarshalDashboard(data []byte) (*DashboardSpec, error) {
	var d DashboardSpec
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

func TestValidateBigExample(t *testing.T) {
	data, err := os.ReadFile("testdata/perses.json")
	require.NoError(t, err, "reading example file")
	_, err = unmarshalDashboard(data)
	assert.NoError(t, err, "expected valid dashboard")
}

func TestValidateDashboardWithSections(t *testing.T) {
	data, err := os.ReadFile("testdata/perses_with_sections.json")
	require.NoError(t, err, "reading example file")
	_, err = unmarshalDashboard(data)
	assert.NoError(t, err, "expected valid dashboard")
}

func TestInvalidateNotAJSON(t *testing.T) {
	_, err := unmarshalDashboard([]byte("not json"))
	assert.Error(t, err, "expected error for invalid JSON")
}

// TestUnmarshalErrorPreservesNestedMessage guards the wrap on dec.Decode in
// DashboardSpec.UnmarshalJSON. The wrap stamps a consistent type/code on
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

	assert.Contains(t, err.Error(), "unknown panel plugin kind",
		"outer wrap should not smother the inner UnmarshalJSON message")
	assert.Contains(t, err.Error(), `"NonExistentPanel"`,
		"the offending value should still appear in the error")
	assert.Contains(t, err.Error(), "allowed values:",
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
	assert.NoError(t, err, "expected valid")
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
	assert.NoError(t, err, "expected valid")
}

func TestInvalidateDuplicateVariableNames(t *testing.T) {
	data := []byte(`{
		"variables": [
			{
				"kind": "TextVariable",
				"spec": {"name": "env", "value": "prod"}
			},
			{
				"kind": "ListVariable",
				"spec": {
					"name": "env",
					"allowAllValue": false,
					"allowMultiple": false,
					"plugin": {
						"kind": "signoz/DynamicVariable",
						"spec": {"name": "service.name", "signal": "metrics"}
					}
				}
			}
		],
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected error for duplicate variable name")
	assert.Contains(t, err.Error(), `duplicate variable name "env"`)
}

func TestInvalidateVariableNameWithInvalidChars(t *testing.T) {
	listVarWithName := func(name string) []byte {
		return []byte(`{
			"variables": [
				{
					"kind": "ListVariable",
					"spec": {
						"name": "` + name + `",
						"allowAllValue": false,
						"allowMultiple": false,
						"plugin": {
							"kind": "signoz/DynamicVariable",
							"spec": {"name": "service.name", "signal": "metrics"}
						}
					}
				}
			],
			"layouts": []
		}`)
	}
	for _, name := range []string{"my var", "cost$", "bad!", "a/b"} {
		t.Run(name, func(t *testing.T) {
			_, err := unmarshalDashboard(listVarWithName(name))
			require.Error(t, err, "expected error for invalid variable name %q", name)
			assert.Contains(t, err.Error(), "is not a correct name")
		})
	}
	for _, name := range []string{"service", "my_var", "MY_VAR", "MixedCase9", "with-hyphen", "with.dot"} {
		t.Run(name, func(t *testing.T) {
			_, err := unmarshalDashboard(listVarWithName(name))
			assert.NoError(t, err, "expected valid variable name %q", name)
		})
	}
	t.Run("digits only", func(t *testing.T) {
		_, err := unmarshalDashboard(listVarWithName("123"))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "cannot contain only digits")
	})
}

func TestInvalidatePanelKey(t *testing.T) {
	data := []byte(`{
		"panels": {
			"bad key!": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TablePanel", "spec": {}},
					"queries": [{
						"kind": "time_series",
						"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
							"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]
						}}}
					}]
				}
			}
		},
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected error for invalid panel key")
	assert.Contains(t, err.Error(), "is not a correct name")
}

func TestInvalidateListVariableCrossFields(t *testing.T) {
	listVar := func(specFields string) []byte {
		return []byte(`{
			"variables": [
				{
					"kind": "ListVariable",
					"spec": {
						"name": "service",
						` + specFields + `
						"plugin": {
							"kind": "signoz/DynamicVariable",
							"spec": {"name": "service.name", "signal": "metrics"}
						}
					}
				}
			],
			"layouts": []
		}`)
	}

	t.Run("customAllValue without allowAllValue", func(t *testing.T) {
		_, err := unmarshalDashboard(listVar(`"allowAllValue": false, "allowMultiple": false, "customAllValue": "*",`))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "customAllValue cannot be set")
	})

	t.Run("list defaultValue without allowMultiple", func(t *testing.T) {
		_, err := unmarshalDashboard(listVar(`"allowAllValue": false, "allowMultiple": false, "defaultValue": ["a", "b"],`))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "allowMultiple")
	})

	t.Run("single-element list default without allowMultiple", func(t *testing.T) {
		_, err := unmarshalDashboard(listVar(`"allowAllValue": false, "allowMultiple": false, "defaultValue": ["only"],`))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "allowMultiple")
	})

	t.Run("valid sort is accepted", func(t *testing.T) {
		_, err := unmarshalDashboard(listVar(`"sort": "alphabetical-asc",`))
		assert.NoError(t, err)
	})

	t.Run("unknown sort is rejected", func(t *testing.T) {
		_, err := unmarshalDashboard(listVar(`"sort": "bogus",`))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unknown sort")
	})
}

func TestInvalidateEmptyVariableName(t *testing.T) {
	cases := map[string][]byte{
		"text variable": []byte(`{
			"variables": [{"kind": "TextVariable", "spec": {"name": "", "value": "x"}}],
			"layouts": []
		}`),
		"list variable": []byte(`{
			"variables": [{
				"kind": "ListVariable",
				"spec": {
					"name": "",
					"allowAllValue": false,
					"allowMultiple": false,
					"plugin": {"kind": "signoz/DynamicVariable", "spec": {"name": "service.name", "signal": "metrics"}}
				}
			}],
			"layouts": []
		}`),
	}
	for name, data := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := unmarshalDashboard(data)
			require.Error(t, err, "expected error for empty variable name")
			assert.Contains(t, err.Error(), "name cannot be empty")
		})
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
			name: "unknown panel envelope kind",
			data: `{
				"panels": {
					"p1": {
						"kind": "Row",
						"spec": {
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "unknown panel kind",
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
								"kind": "time_series",
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
			name: "unknown query envelope kind",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
							"queries": [{
								"kind": "TimeSeriesQuery",
								"spec": {
									"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "metrics"}}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "unknown request type",
		},
		{
			name: "empty query envelope kind",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
							"queries": [{
								"kind": "",
								"spec": {
									"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "metrics"}}
								}
							}]
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "unknown request type",
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
			assert.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
	assert.Contains(t, err.Error(), "FakePanel", "error should mention FakePanel")
}

func TestInvalidateLayoutPanelReferences(t *testing.T) {
	validPanels := `"panels": {
		"p1": {
			"kind": "Panel",
			"spec": {
				"plugin": {"kind": "signoz/TablePanel", "spec": {}},
				"queries": [{
					"kind": "time_series",
					"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
						"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]
					}}}
				}]
			}
		}
	}`
	layout := func(items string) []byte {
		return []byte(`{` + validPanels + `, "layouts": [{"kind": "Grid", "spec": {"items": [` + items + `]}}]}`)
	}

	tests := []struct {
		name        string
		data        []byte
		wantContain string
	}{
		{
			name:        "reference to unknown panel",
			data:        layout(`{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/ghost"}}`),
			wantContain: `references unknown panel "ghost"`,
		},
		{
			name:        "reference not pointing at a panel",
			data:        layout(`{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/variables/p1"}}`),
			wantContain: "must reference a panel",
		},
		{
			name:        "reference missing spec prefix",
			data:        layout(`{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/panels/p1"}}`),
			wantContain: "must reference a panel",
		},
		{
			name:        "valid reference",
			data:        layout(`{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}}`),
			wantContain: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := unmarshalDashboard(tt.data)
			if tt.wantContain == "" {
				assert.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantContain)
		})
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
								"kind": "time_series",
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
			assert.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
								"kind": "time_series",
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
				assert.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
								"kind": "time_series",
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
			name: "bad legend mode",
			data: `{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {
								"kind": "signoz/BarChartPanel",
								"spec": {"legend": {"mode": "grid"}}
							}
						}
					}
				},
				"layouts": []
			}`,
			wantContain: "legend mode",
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
								"spec": {"thresholds": [{"value": 100, "operator": "above", "color": "Red", "format": "Color"}]}
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
			assert.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
		})
	}
}

// Label on ThresholdWithLabel is optional — the backend never reads it, so a
// threshold with an omitted or empty label must validate cleanly.
func TestThresholdLabelOptional(t *testing.T) {
	for _, tt := range []struct {
		name      string
		threshold string
	}{
		{name: "label omitted", threshold: `{"value": 100, "color": "Red"}`},
		{name: "label empty", threshold: `{"value": 100, "color": "Red", "label": ""}`},
	} {
		t.Run(tt.name, func(t *testing.T) {
			data := []byte(`{
				"panels": {
					"p1": {
						"kind": "Panel",
						"spec": {
							"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {"thresholds": [` + tt.threshold + `]}},
							"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
						}
					}
				},
				"layouts": []
			}`)
			d, err := unmarshalDashboard(data)
			require.NoError(t, err, "threshold without a label should validate")

			spec := d.Panels["p1"].Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
			require.Len(t, spec.Thresholds, 1)
			assert.Empty(t, spec.Thresholds[0].Label, "label should remain empty")
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
	assert.Contains(t, err.Error(), "panel must have one query")
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
	assert.Contains(t, err.Error(), "panel must have one query")
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
						{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "metrics"}}}},
						{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "B", "signal": "metrics"}}}}
					]
				}
			}
		},
		"layouts": []
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err, "expected panel with two top-level queries to be rejected")
	assert.Contains(t, err.Error(), "panel must have one query")
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
			name:        "ComparisonThreshold missing value",
			data:        wrapPanel("signoz/NumberPanel", `{"thresholds": [{"operator": "above", "format": "text", "color": "Red"}]}`),
			wantContain: "Value",
		},
		{
			name:        "ComparisonThreshold missing color",
			data:        wrapPanel("signoz/NumberPanel", `{"thresholds": [{"value": 100, "operator": "above", "format": "text", "color": ""}]}`),
			wantContain: "Color",
		},
		{
			name:        "TableThreshold missing columnName",
			data:        wrapPanel("signoz/TablePanel", `{"thresholds": [{"value": 100, "operator": "above", "format": "text", "color": "Red", "columnName": ""}]}`),
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
			assert.Contains(t, err.Error(), tt.wantContain, "error should mention %q", tt.wantContain)
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
					"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
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

	assert.Equal(t, "2", spec.Formatting.DecimalPrecision.ValueOrDefault(), "expected DecimalPrecision default 2")
	assert.Equal(t, "spline", spec.ChartAppearance.LineInterpolation.ValueOrDefault(), "expected LineInterpolation default spline")
	assert.Equal(t, "solid", spec.ChartAppearance.LineStyle.ValueOrDefault(), "expected LineStyle default solid")
	assert.Equal(t, "none", spec.ChartAppearance.FillMode.ValueOrDefault(), "expected FillMode default none")
	assert.False(t, spec.ChartAppearance.SpanGaps.FillOnlyBelow, "expected SpanGaps.FillOnlyBelow default false")
	assert.Equal(t, "global_time", spec.Visualization.TimePreference.ValueOrDefault(), "expected TimePreference default global_time")
	assert.Equal(t, "bottom", spec.Legend.Position.ValueOrDefault(), "expected LegendPosition default bottom")
	assert.Equal(t, "list", spec.Legend.Mode.ValueOrDefault(), "expected LegendMode default list")

	// Re-marshal the full dashboard (what we'd store in DB / return in API response)
	// and verify the output contains the default values.
	output, err := json.Marshal(d)
	require.NoError(t, err, "marshal dashboard failed")
	outputStr := string(output)
	for field, want := range map[string]string{
		"decimalPrecision":  `"2"`,
		"lineInterpolation": `"spline"`,
		"lineStyle":         `"solid"`,
		"fillMode":          `"none"`,
		"timePreference":    `"global_time"`,
		"position":          `"bottom"`,
		"mode":              `"list"`,
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
					"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
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
	assert.Equal(t, "above", spec.Thresholds[0].Operator.ValueOrDefault(), "expected ComparisonOperator default above")
	assert.Equal(t, "text", spec.Thresholds[0].Format.ValueOrDefault(), "expected ThresholdFormat default text")

	// Marshal back and verify defaults in JSON output.
	output, err := json.Marshal(d)
	require.NoError(t, err, "marshal dashboard failed")
	outputStr := string(output)
	assert.Contains(t, outputStr, `"format":"text"`, "expected stored/response JSON to contain format:text")
	assert.Contains(t, outputStr, `"operator":"above"`, "expected stored/response JSON to contain operator:above")
}

// TestPersesFixtureStorageRoundTrip exercises the typed → map[string]any →
// typed cycle that the create/get path performs against the kitchen-sink
// fixture. Catches plugin specs whose UnmarshalJSON expects a different shape
// than the default MarshalJSON emits.
func TestPersesFixtureStorageRoundTrip(t *testing.T) {
	raw, err := os.ReadFile("testdata/perses.json")
	require.NoError(t, err)

	var data DashboardSpec
	require.NoError(t, json.Unmarshal(raw, &data), "initial unmarshal")

	marshaled, err := json.Marshal(data)
	require.NoError(t, err, "marshal typed → JSON")

	var asMap map[string]any
	require.NoError(t, json.Unmarshal(marshaled, &asMap), "JSON → map (storage shape)")

	remarshaled, err := json.Marshal(asMap)
	require.NoError(t, err, "map → JSON (read-back shape)")

	var roundtripped DashboardSpec
	assert.NoError(t, json.Unmarshal(remarshaled, &roundtripped), "JSON → typed (the failure mode)")
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
					"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			},
			"p2": {
				"kind": "Panel",
				"spec": {
					"plugin": {
						"kind": "signoz/NumberPanel",
						"spec": {"thresholds": [{"value": 100, "color": "Red"}]}
					},
					"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
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
	assert.Equal(t, "none", tsSpec.ChartAppearance.FillMode.ValueOrDefault())
	assert.Equal(t, "global_time", tsSpec.Visualization.TimePreference.ValueOrDefault())
	assert.Equal(t, "bottom", tsSpec.Legend.Position.ValueOrDefault())
	numSpec := d.Panels["p2"].Spec.Plugin.Spec.(*NumberPanelSpec)
	assert.Equal(t, "above", numSpec.Thresholds[0].Operator.ValueOrDefault())
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
	assert.Equal(t, "none", tsLoaded.ChartAppearance.FillMode.ValueOrDefault(), "after load")
	assert.Equal(t, "global_time", tsLoaded.Visualization.TimePreference.ValueOrDefault(), "after load")
	assert.Equal(t, "bottom", tsLoaded.Legend.Position.ValueOrDefault(), "after load")
	numLoaded := loaded.Panels["p2"].Spec.Plugin.Spec.(*NumberPanelSpec)
	assert.Equal(t, "above", numLoaded.Thresholds[0].Operator.ValueOrDefault(), "after load")
	assert.Equal(t, "text", numLoaded.Thresholds[0].Format.ValueOrDefault(), "after load")

	// Step 4: Marshal again (simulates API response) and verify defaults.
	response, err := json.Marshal(loaded)
	require.NoError(t, err, "marshal for response failed")
	responseStr := string(response)

	for field, want := range map[string]string{
		"decimalPrecision":  `"2"`,
		"lineInterpolation": `"spline"`,
		"lineStyle":         `"solid"`,
		"fillMode":          `"none"`,
		"timePreference":    `"global_time"`,
		"position":          `"bottom"`,
		"format":            `"text"`,
	} {
		assert.Contains(t, responseStr, `"`+field+`":`+want, "expected %s:%s after storage round-trip", field, want)
	}

	assert.Contains(t, responseStr, `"operator":"above"`, "expected operator:above after storage round-trip")
}

func TestPostableDashboardV2GenerateNameFlag(t *testing.T) {
	const validSpec = `"spec": {"panels": {}, "layouts": []}`

	tests := []struct {
		scenario     string
		body         string
		wantErr      bool
		wantErrMatch string
		wantName     string
		wantDisplay  string
	}{
		{
			scenario:    "flag true with display.name derives name on conversion",
			body:        `{"schemaVersion":"` + SchemaVersion + `","generateName":true,"spec":{"display":{"name":"My Dashboard!"},"panels":{},"layouts":[]}}`,
			wantName:    "",
			wantDisplay: "My Dashboard!",
		},
		{
			scenario:     "flag true with non-empty name is rejected",
			body:         `{"schemaVersion":"` + SchemaVersion + `","name":"already-set","generateName":true,"spec":{"display":{"name":"My Dashboard"},"panels":{},"layouts":[]}}`,
			wantErr:      true,
			wantErrMatch: "name must be empty when generateName is true",
		},
		{
			scenario:     "flag true with empty display.name is rejected",
			body:         `{"schemaVersion":"` + SchemaVersion + `","generateName":true,` + validSpec + `}`,
			wantErr:      true,
			wantErrMatch: "spec.display.name is required",
		},
		{
			scenario:    "flag false",
			body:        `{"schemaVersion":"` + SchemaVersion + `","name":"my-dashboard",` + validSpec + `}`,
			wantName:    "my-dashboard",
			wantDisplay: "my-dashboard",
		},
		{
			scenario:     "flag false with missing name is rejected",
			body:         `{"schemaVersion":"` + SchemaVersion + `",` + validSpec + `}`,
			wantErr:      true,
			wantErrMatch: "name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.scenario, func(t *testing.T) {
			var p PostableDashboardV2
			err := json.Unmarshal([]byte(tt.body), &p)
			if tt.wantErr {
				require.Error(t, err, "expected validation error")
				assert.Contains(t, err.Error(), tt.wantErrMatch)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantName, p.Name)
			assert.Equal(t, tt.wantDisplay, p.Spec.Display.Name)
		})
	}
}

func TestGenerateDashboardName(t *testing.T) {
	tests := []struct {
		scenario   string
		input      string
		wantPrefix string // expected slug prefix before the "-<suffix>" tail (empty if prefix is dropped)
	}{
		{scenario: "simple words with spaces", input: "My Dashboard", wantPrefix: "my-dashboard"},
		{scenario: "punctuation collapses", input: "Hello, World!", wantPrefix: "hello-world"},
		{scenario: "leading and trailing whitespace", input: "  hello  ", wantPrefix: "hello"},
		{scenario: "leading and trailing hyphens", input: "---abc---", wantPrefix: "abc"},
		{scenario: "consecutive non-alphanumerics collapse", input: "a___b...c", wantPrefix: "a-b-c"},
		{scenario: "digits are preserved", input: "Region us-east-1", wantPrefix: "region-us-east-1"},
		{scenario: "no alphanumerics drops prefix and returns suffix only", input: "!!! ???", wantPrefix: ""},
	}

	for _, tt := range tests {
		t.Run(tt.scenario, func(t *testing.T) {
			got := generateDashboardName(tt.input)
			assert.NotEmpty(t, got)
			assert.LessOrEqual(t, len(got), 63)
			assert.Empty(t, validation.IsDNS1123Label(got), "result must be a valid DNS-1123 label")

			if tt.wantPrefix == "" {
				assert.Len(t, got, dashboardNameSuffixLen, "expected the bare random suffix")
				return
			}
			expectedPrefix := tt.wantPrefix + "-"
			assert.True(t, strings.HasPrefix(got, expectedPrefix), "expected prefix %q, got %q", expectedPrefix, got)
			assert.Len(t, got, len(expectedPrefix)+dashboardNameSuffixLen)
		})
	}

	t.Run("prefix is truncated to leave room for the suffix", func(t *testing.T) {
		input := strings.Repeat("a", 100)
		got := generateDashboardName(input)
		assert.LessOrEqual(t, len(got), 63)
		assert.Empty(t, validation.IsDNS1123Label(got))
		assert.Equal(t, len(got), 63, "expected the result to be padded to the max DNS-1123 length")
	})

	t.Run("suffix differs across calls", func(t *testing.T) {
		first := generateDashboardName("collision-test")
		second := generateDashboardName("collision-test")
		assert.NotEqual(t, first, second, "expected the random suffix to differ across calls")
	})
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
	// A panel's query carries the request type implied by the panel kind: list panels
	// are raw (no aggregation), table-like panels are scalar, the rest time series.
	requestKind := func(panelKind string) string {
		switch panelKind {
		case "signoz/ListPanel":
			return "raw"
		case "signoz/TablePanel", "signoz/NumberPanel", "signoz/PieChartPanel", "signoz/HistogramPanel":
			return "scalar"
		default:
			return "time_series"
		}
	}
	mkQuery := func(panelKind, queryKind, querySpec string) []byte {
		return []byte(`{
			"panels": {"p1": {"kind": "Panel", "spec": {
				"plugin": {"kind": "` + panelKind + `", "spec": {}},
				"queries": [{"kind": "` + requestKind(panelKind) + `", "spec": {"plugin": {"kind": "` + queryKind + `", "spec": ` + querySpec + `}}}]
			}}},
			"layouts": []
		}`)
	}
	mkComposite := func(panelKind, subType, subSpec string) []byte {
		return []byte(`{
			"panels": {"p1": {"kind": "Panel", "spec": {
				"plugin": {"kind": "` + panelKind + `", "spec": {}},
				"queries": [{"kind": "` + requestKind(panelKind) + `", "spec": {"plugin": {"kind": "signoz/CompositeQuery", "spec": {
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
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestCommaSeparatedAggregationRejectedOnWrite asserts the write path (unmarshalDashboard
// runs DashboardSpec.Validate) rejects an aggregation that packs several comma-separated
// calls into one expression, while accepting a single call and a properly pre-split list.
func TestCommaSeparatedAggregationRejectedOnWrite(t *testing.T) {
	buildDashboardWithLogsAggregation := func(aggregationsJSON string) []byte {
		return []byte(`{
		"panels": {"p1": {"kind": "Panel", "spec": {
			"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
			"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
				"name": "A", "signal": "logs", "aggregations": ` + aggregationsJSON + `
			}}}}]
		}}},
		"layouts": []
	}`)
	}

	t.Run("comma-separated expression is rejected", func(t *testing.T) {
		_, err := unmarshalDashboard(buildDashboardWithLogsAggregation(`[{"expression": "count(), sum(bytes)"}]`))
		require.Error(t, err)
		require.Contains(t, err.Error(), "single function call")
		assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
	})

	t.Run("single-call expression is accepted", func(t *testing.T) {
		_, err := unmarshalDashboard(buildDashboardWithLogsAggregation(`[{"expression": "count()"}]`))
		require.NoError(t, err)
	})

	t.Run("pre-split aggregations are accepted", func(t *testing.T) {
		_, err := unmarshalDashboard(buildDashboardWithLogsAggregation(`[{"expression": "count()"}, {"expression": "sum(bytes)"}]`))
		require.NoError(t, err)
	})

	t.Run("comma inside function args is not mistaken for multiple calls", func(t *testing.T) {
		_, err := unmarshalDashboard(buildDashboardWithLogsAggregation(`[{"expression": "countIf(day > 10, status)"}]`))
		require.NoError(t, err)
	})
}

func TestValidateGridGeometry(t *testing.T) {
	tests := []struct {
		scenario         string
		items            []dashboard.GridItem
		expectErrContain string
	}{
		{
			scenario:         "valid side-by-side items",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 6, Height: 6}, {X: 6, Y: 0, Width: 6, Height: 6}},
			expectErrContain: "",
		},
		{
			scenario:         "valid full-width item",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 12, Height: 6}},
			expectErrContain: "",
		},
		{
			scenario:         "stacked items do not overlap",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 6, Height: 6}, {X: 0, Y: 6, Width: 6, Height: 6}},
			expectErrContain: "",
		},
		{
			scenario:         "zero width",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 0, Height: 6}},
			expectErrContain: "width must be at least 1",
		},
		{
			scenario:         "zero height",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 6, Height: 0}},
			expectErrContain: "height must be at least 1",
		},
		{
			scenario:         "negative x",
			items:            []dashboard.GridItem{{X: -1, Y: 0, Width: 6, Height: 6}},
			expectErrContain: "x must not be negative",
		},
		{
			scenario:         "negative y",
			items:            []dashboard.GridItem{{X: 0, Y: -1, Width: 6, Height: 6}},
			expectErrContain: "y must not be negative",
		},
		{
			scenario:         "width wider than grid",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 13, Height: 6}},
			expectErrContain: "width (13) exceeds grid width 12",
		},
		{
			scenario:         "x at grid width",
			items:            []dashboard.GridItem{{X: 12, Y: 0, Width: 1, Height: 6}},
			expectErrContain: "x (12) must be less than grid width 12",
		},
		{
			scenario:         "x plus width overflows grid",
			items:            []dashboard.GridItem{{X: 8, Y: 0, Width: 6, Height: 6}},
			expectErrContain: "x (8) + width (6) exceeds grid width 12",
		},
		{
			scenario:         "overlapping items",
			items:            []dashboard.GridItem{{X: 0, Y: 0, Width: 6, Height: 6}, {X: 3, Y: 3, Width: 6, Height: 6}},
			expectErrContain: "items[0] and items[1] overlap",
		},
	}
	for _, test := range tests {
		t.Run(test.scenario, func(t *testing.T) {
			err := validateGridLayoutGeometry(&dashboard.GridLayoutSpec{Items: test.items}, 0)
			if test.expectErrContain == "" {
				assert.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), test.expectErrContain)
		})
	}
}

func TestValidateGridItemLimit(t *testing.T) {
	err := validateGridLayoutGeometry(&dashboard.GridLayoutSpec{Items: make([]dashboard.GridItem, maxItemsPerGridLayout+1)}, 0)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "maximum is")
}

// Both panel refs are valid, so this errors only if geometry validation runs on
// the unmarshal path — it does, via DashboardSpec.Validate -> validateLayouts.
func TestInvalidateLayoutOverlapViaUnmarshal(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {"kind": "Panel", "spec": {"plugin": {"kind": "signoz/TablePanel", "spec": {}}, "queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}}}]}},
			"p2": {"kind": "Panel", "spec": {"plugin": {"kind": "signoz/TablePanel", "spec": {}}, "queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}}}]}}
		},
		"layouts": [{"kind": "Grid", "spec": {"items": [
			{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
			{"x": 3, "y": 3, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p2"}}
		]}}]
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "overlap")
}

// The frontend keys each grid item by its panel id, so the same panel placed by
// two grid items crashes the section; the backend rejects it dashboard-wide. The
// two items are side by side so they clear the overlap check first.
func TestInvalidateDuplicatePanelReference(t *testing.T) {
	data := []byte(`{
		"panels": {
			"p1": {"kind": "Panel", "spec": {"plugin": {"kind": "signoz/TablePanel", "spec": {}}, "queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}}}]}}
		},
		"layouts": [{"kind": "Grid", "spec": {"items": [
			{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
			{"x": 6, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}}
		]}}]
	}`)
	_, err := unmarshalDashboard(data)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already placed")
	// Both offending grid items are named.
	assert.Contains(t, err.Error(), "spec.layouts[0].spec.items[0].content")
	assert.Contains(t, err.Error(), "spec.layouts[0].spec.items[1].content")
}

// Every display name — dashboard, panel, variable — and the grid layout title is
// bounded at MaxDisplayNameLen. The name is one over the limit in each case, and
// the message reads "<json path>: <field> name must be at most ...", pairing the
// locatable path (like the other spec errors) with a human field label.
func TestInvalidateDisplayNameTooLong(t *testing.T) {
	tooLong := strings.Repeat("x", MaxDisplayNameLen+1)
	lengthMsg := fmt.Sprintf("must be at most %d characters, got %d", MaxDisplayNameLen, MaxDisplayNameLen+1)

	testCases := []struct {
		scenario      string
		dashboardJSON string
		expectedPath  string
		expectedLabel string
	}{
		{
			scenario:      "dashboard display name",
			dashboardJSON: `{"display": {"name": "` + tooLong + `"}, "layouts": []}`,
			expectedLabel: "dashboard",
			expectedPath:  "spec.display.name",
		},
		{
			scenario:      "panel display name",
			dashboardJSON: `{"panels": {"p1": {"kind": "Panel", "spec": {"display": {"name": "` + tooLong + `"}, "plugin": {"kind": "signoz/TablePanel", "spec": {}}, "queries": []}}}, "layouts": []}`,
			expectedLabel: "panel",
			expectedPath:  "spec.panels.p1.spec.display.name",
		},
		{
			scenario:      "list variable display name",
			dashboardJSON: `{"variables": [{"kind": "ListVariable", "spec": {"name": "svc", "display": {"name": "` + tooLong + `"}, "plugin": {"kind": "signoz/DynamicVariable", "spec": {"name": "service.name", "signal": "metrics"}}}}], "layouts": []}`,
			expectedLabel: "variable",
			expectedPath:  "spec.variables[0].spec.display.name",
		},
		{
			scenario:      "text variable display name",
			dashboardJSON: `{"variables": [{"kind": "TextVariable", "spec": {"name": "mytext", "value": "v", "display": {"name": "` + tooLong + `"}}}], "layouts": []}`,
			expectedLabel: "variable",
			expectedPath:  "spec.variables[0].spec.display.name",
		},
		{
			scenario:      "layout title",
			dashboardJSON: `{"layouts": [{"kind": "Grid", "spec": {"display": {"title": "` + tooLong + `"}, "items": []}}]}`,
			expectedLabel: "layout",
			expectedPath:  "spec.layouts[0].spec.display.title",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.scenario, func(t *testing.T) {
			_, err := unmarshalDashboard([]byte(testCase.dashboardJSON))
			require.Error(t, err)
			// Message is "<path>: <label> name must be at most N characters, got M".
			want := testCase.expectedPath + ": " + testCase.expectedLabel + " name " + lengthMsg
			assert.Equal(t, want, errors.AsJSON(err).Message)
		})
	}
}

// A display name at exactly the limit is accepted.
func TestValidateDisplayNameAtMaxLength(t *testing.T) {
	atLimit := strings.Repeat("x", MaxDisplayNameLen)
	_, err := unmarshalDashboard([]byte(`{"display": {"name": "` + atLimit + `"}, "layouts": []}`))
	assert.NoError(t, err)
}

func TestEnsureSingleExpressionAggregation(t *testing.T) {
	testCases := []struct {
		description    string
		expression     string
		expectRejected bool
	}{
		{description: "single call is accepted", expression: "count()", expectRejected: false},
		{description: "comma-separated calls are rejected", expression: "count(), sum(bytes)", expectRejected: true},
		{description: "comma inside function args is a single call", expression: "countIf(day > 10, status)", expectRejected: false},
		{description: "nested function call is a single aggregation", expression: "sum(toFloat64(x))", expectRejected: false},
		{description: "parenthesis inside a string literal is not a call", expression: "countIf(body LIKE '%(done)%')", expectRejected: false},
		{description: "closing paren inside a string literal followed by word-paren is not a second call", expression: "countIf(body = 'a)b(c)')", expectRejected: false},
		{description: "unparseable expression is rejected", expression: "count(", expectRejected: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			err := ensureSingleExpressionAggregation(testCase.expression)
			if testCase.expectRejected {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
