package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// ============================================================================
// Helper Functions for Test Data Creation
// ============================================================================

// makeKey creates a TelemetryFieldKey for testing
func makeKey(name string, dataType JSONDataType, materialized bool) *TelemetryFieldKey {
	return &TelemetryFieldKey{
		Name:         name,
		JSONDataType: &dataType,
		Materialized: materialized,
	}
}

// ============================================================================
// Helper Functions for Node Validation
// ============================================================================

// jsonAccessTestNode is a test-only, YAML-friendly view of JSONAccessNode.
// It intentionally omits Parent to avoid cycles and only keeps the fields
// that are useful for understanding / asserting the plan structure.
type jsonAccessTestNode struct {
	Name            string                         `yaml:"name"`
	Column          string                         `yaml:"column,omitempty"`
	IsTerminal      bool                           `yaml:"isTerminal,omitempty"`
	MaxDynamicTypes int                            `yaml:"maxDynamicTypes,omitempty"`
	MaxDynamicPaths int                            `yaml:"maxDynamicPaths,omitempty"`
	ElemType        string                         `yaml:"elemType,omitempty"`
	AvailableTypes  []string                       `yaml:"availableTypes,omitempty"`
	Branches        map[string]*jsonAccessTestNode `yaml:"branches,omitempty"`
}

// toTestNode converts a JSONAccessNode tree into jsonAccessTestNode so that
// it can be serialized to YAML for easy visual comparison in tests.
func toTestNode(n *JSONAccessNode) *jsonAccessTestNode {
	if n == nil {
		return nil
	}

	out := &jsonAccessTestNode{
		Name:            n.Name,
		IsTerminal:      n.IsTerminal,
		MaxDynamicTypes: n.MaxDynamicTypes,
		MaxDynamicPaths: n.MaxDynamicPaths,
	}

	// Column information for top-level plan nodes: their parent is the root,
	// whose parent is nil.
	if n.Parent != nil && n.Parent.Parent == nil {
		out.Column = n.Parent.Name
	}

	// AvailableTypes as strings (using StringValue for stable representation)
	if len(n.AvailableTypes) > 0 {
		out.AvailableTypes = make([]string, 0, len(n.AvailableTypes))
		for _, t := range n.AvailableTypes {
			out.AvailableTypes = append(out.AvailableTypes, t.StringValue())
		}
	}

	// Terminal config
	if n.TerminalConfig != nil {
		out.ElemType = n.TerminalConfig.ElemType.StringValue()
	}

	// Branches
	if len(n.Branches) > 0 {
		out.Branches = make(map[string]*jsonAccessTestNode, len(n.Branches))
		for bt, child := range n.Branches {
			out.Branches[bt.StringValue()] = toTestNode(child)
		}
	}

	return out
}

// plansToYAML converts a slice of JSONAccessNode plans to a YAML string that
// can be compared against a per-test expectedTree.
func plansToYAML(t *testing.T, plans []*JSONAccessNode) string {
	t.Helper()

	testNodes := make([]*jsonAccessTestNode, 0, len(plans))
	for _, p := range plans {
		testNodes = append(testNodes, toTestNode(p))
	}

	got, err := yaml.Marshal(testNodes)
	require.NoError(t, err)
	return string(got)
}

// ============================================================================
// Test Cases for Node Methods
// ============================================================================

func TestNode_Alias(t *testing.T) {
	tests := []struct {
		name     string
		node     *JSONAccessNode
		expected string
	}{
		{
			name:     "Root node returns name as-is",
			node:     NewRootJSONAccessNode("body_json", 32, 0),
			expected: "body_json",
		},
		{
			name: "Node without parent returns backticked name",
			node: &JSONAccessNode{
				Name:   "user",
				Parent: nil,
			},
			expected: "`user`",
		},
		{
			name: "Node with root parent uses dot separator",
			node: &JSONAccessNode{
				Name:   "age",
				Parent: NewRootJSONAccessNode("body_json", 32, 0),
			},
			expected: "`" + "body_json" + ".age`",
		},
		{
			name: "Node with non-root parent uses array separator",
			node: &JSONAccessNode{
				Name: "name",
				Parent: &JSONAccessNode{
					Name:   "education",
					Parent: NewRootJSONAccessNode("body_json", 32, 0),
				},
			},
			expected: "`" + "body_json" + ".education[].name`",
		},
		{
			name: "Nested array path with multiple levels",
			node: &JSONAccessNode{
				Name: "type",
				Parent: &JSONAccessNode{
					Name: "awards",
					Parent: &JSONAccessNode{
						Name:   "education",
						Parent: NewRootJSONAccessNode("body_json", 32, 0),
					},
				},
			},
			expected: "`" + "body_json" + ".education[].awards[].type`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.node.Alias()
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestNode_FieldPath(t *testing.T) {
	tests := []struct {
		name     string
		node     *JSONAccessNode
		expected string
	}{
		{
			name: "Simple field path from root",
			node: &JSONAccessNode{
				Name:   "user",
				Parent: NewRootJSONAccessNode("body_json", 32, 0),
			},
			// FieldPath() always wraps the field name in backticks
			expected: "body_json" + ".`user`",
		},
		{
			name: "Field path with backtick-required key",
			node: &JSONAccessNode{
				Name:   "user-name", // requires backtick
				Parent: NewRootJSONAccessNode("body_json", 32, 0),
			},
			expected: "body_json" + ".`user-name`",
		},
		{
			name: "Nested field path",
			node: &JSONAccessNode{
				Name: "age",
				Parent: &JSONAccessNode{
					Name:   "user",
					Parent: NewRootJSONAccessNode("body_json", 32, 0),
				},
			},
			// FieldPath() always wraps the field name in backticks
			expected: "`" + "body_json" + ".user`.`age`",
		},
		{
			name: "Array element field path",
			node: &JSONAccessNode{
				Name: "name",
				Parent: &JSONAccessNode{
					Name:   "education",
					Parent: NewRootJSONAccessNode("body_json", 32, 0),
				},
			},
			// FieldPath() always wraps the field name in backticks
			expected: "`" + "body_json" + ".education`.`name`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.node.FieldPath()
			require.Equal(t, tt.expected, result)
		})
	}
}

// ============================================================================
// Test Cases for PlanJSON
// ============================================================================

func TestPlanJSON_BasicStructure(t *testing.T) {
	types, _ := TestJSONTypeSet()

	tests := []struct {
		name         string
		key          *TelemetryFieldKey
		expectErr    bool
		expectedYAML string
	}{
		{
			name: "Simple path not promoted",
			key:  makeKey("user.name", String, false),
			expectedYAML: `
- name: user.name
  column: body_json
  availableTypes:
    - String
  maxDynamicTypes: 16
  isTerminal: true
  elemType: String
`,
		},
		{
			name: "Simple path promoted",
			key:  makeKey("user.name", String, true),
			expectedYAML: `
- name: user.name
  column: body_json
  availableTypes:
    - String
  maxDynamicTypes: 16
  isTerminal: true
  elemType: String
- name: user.name
  column: body_json_promoted
  availableTypes:
    - String
  maxDynamicTypes: 16
  maxDynamicPaths: 256
  isTerminal: true
  elemType: String
`,
		},
		{
			name:         "Empty path returns error",
			key:          makeKey("", String, false),
			expectErr:    true,
			expectedYAML: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.key.SetJSONAccessPlan(JSONColumnMetadata{
				BaseColumn:     "body_json",
				PromotedColumn: "body_json_promoted",
			}, types)
			if tt.expectErr {
				require.Error(t, err)
				require.Nil(t, tt.key.JSONPlan)
				return
			}
			require.NoError(t, err)
			got := plansToYAML(t, tt.key.JSONPlan)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_ArrayPaths(t *testing.T) {
	types, _ := TestJSONTypeSet()

	tests := []struct {
		name         string
		path         string
		expectedYAML string
	}{
		{
			name: "Single array level - JSON branch only",
			path: "education[].name",
			expectedYAML: `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: name
      availableTypes:
        - String
      maxDynamicTypes: 8
      isTerminal: true
      elemType: String
`,
		},
		{
			name: "Single array level - both JSON and Dynamic branches",
			path: "education[].awards[].type",
			expectedYAML: `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: awards
      availableTypes:
        - Array(Dynamic)
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 4
          isTerminal: true
          elemType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
`,
		},
		{
			name: "Deeply nested array path",
			path: "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
			expectedYAML: `
- name: interests
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: entities
      availableTypes:
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: reviews
          availableTypes:
            - Array(JSON)
          maxDynamicTypes: 4
          branches:
            json:
              name: entries
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 2
              branches:
                json:
                  name: metadata
                  availableTypes:
                    - Array(JSON)
                  maxDynamicTypes: 1
                  branches:
                    json:
                      name: positions
                      availableTypes:
                        - Array(JSON)
                      branches:
                        json:
                          name: name
                          availableTypes:
                            - String
                          isTerminal: true
                          elemType: String
`,
		},
		{
			name: "ArrayAnyIndex replacement [*] to []",
			path: "education[*].name",
			expectedYAML: `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: name
      availableTypes:
        - String
      maxDynamicTypes: 8
      isTerminal: true
      elemType: String
`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := makeKey(tt.path, String, false)
			err := key.SetJSONAccessPlan(JSONColumnMetadata{
				BaseColumn:     "body_json",
				PromotedColumn: "body_json_promoted",
			}, types)
			require.NoError(t, err)
			require.NotNil(t, key.JSONPlan)
			require.Len(t, key.JSONPlan, 1)
			got := plansToYAML(t, key.JSONPlan)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_PromotedVsNonPromoted(t *testing.T) {
	types, _ := TestJSONTypeSet()
	path := "education[].awards[].type"

	t.Run("Non-promoted plan", func(t *testing.T) {
		key := makeKey(path, String, false)
		err := key.SetJSONAccessPlan(JSONColumnMetadata{
			BaseColumn:     "body_json",
			PromotedColumn: "body_json_promoted",
		}, types)
		require.NoError(t, err)
		require.Len(t, key.JSONPlan, 1)

		expectedYAML := `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: awards
      availableTypes:
        - Array(Dynamic)
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 4
          isTerminal: true
          elemType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
`
		got := plansToYAML(t, key.JSONPlan)
		require.YAMLEq(t, expectedYAML, got)
	})

	t.Run("Promoted plan", func(t *testing.T) {
		key := makeKey(path, String, true)
		err := key.SetJSONAccessPlan(JSONColumnMetadata{
			BaseColumn:     "body_json",
			PromotedColumn: "body_json_promoted",
		}, types)
		require.NoError(t, err)
		require.Len(t, key.JSONPlan, 2)

		expectedYAML := `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: awards
      availableTypes:
        - Array(Dynamic)
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 4
          isTerminal: true
          elemType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
- name: education
  column: body_json_promoted
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  maxDynamicPaths: 256
  branches:
    json:
      name: awards
      availableTypes:
        - Array(Dynamic)
        - Array(JSON)
      maxDynamicTypes: 8
      maxDynamicPaths: 64
      branches:
        json:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 4
          maxDynamicPaths: 16
          isTerminal: true
          elemType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
`
		got := plansToYAML(t, key.JSONPlan)
		require.YAMLEq(t, expectedYAML, got)
	})
}

func TestPlanJSON_EdgeCases(t *testing.T) {
	types, _ := TestJSONTypeSet()

	tests := []struct {
		name         string
		path         string
		expectedYAML string
		expectErr    bool
	}{
		{
			name:      "Path with no available types",
			path:      "unknown.path",
			expectErr: true,
		},
		{
			name:  "Very deep nesting - validates progression doesn't go negative",
			path:  "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
			expectedYAML: `
- name: interests
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: entities
      availableTypes:
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: reviews
          availableTypes:
            - Array(JSON)
          maxDynamicTypes: 4
          branches:
            json:
              name: entries
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 2
              branches:
                json:
                  name: metadata
                  availableTypes:
                    - Array(JSON)
                  maxDynamicTypes: 1
                  branches:
                    json:
                      name: positions
                      availableTypes:
                        - Array(JSON)
                      branches:
                        json:
                          name: name
                          availableTypes:
                            - String
                          isTerminal: true
                          elemType: String
`,
		},
		{
			name:  "Path with mixed scalar and array types",
			path:  "education[].type",
			expectedYAML: `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: type
      availableTypes:
        - String
        - Int64
      maxDynamicTypes: 8
      isTerminal: true
      elemType: String
`,
		},
		{
			name:  "Exists with only array types available",
			path:  "education",
			expectedYAML: `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  isTerminal: true
  elemType: Array(JSON)
`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Choose key type based on path; operator does not affect the tree shape asserted here.
			keyType := String
			switch tt.path {
			case "education":
				keyType = ArrayJSON
			case "education[].type":
				keyType = String
			}
			key := makeKey(tt.path, keyType, false)
			err := key.SetJSONAccessPlan(JSONColumnMetadata{
				BaseColumn:     "body_json",
				PromotedColumn: "body_json_promoted",
			}, types)
			if tt.expectErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			got := plansToYAML(t, key.JSONPlan)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_TreeStructure(t *testing.T) {
	types, _ := TestJSONTypeSet()
	path := "education[].awards[].participated[].team[].branch"
	key := makeKey(path, String, false)
	err := key.SetJSONAccessPlan(JSONColumnMetadata{
		BaseColumn:     "body_json",
		PromotedColumn: "body_json_promoted",
	}, types)
	require.NoError(t, err)
	require.Len(t, key.JSONPlan, 1)

	expectedYAML := `
- name: education
  column: body_json
  availableTypes:
    - Array(JSON)
  maxDynamicTypes: 16
  branches:
    json:
      name: awards
      availableTypes:
        - Array(Dynamic)
        - Array(JSON)
      maxDynamicTypes: 8
      branches:
        json:
          name: participated
          availableTypes:
            - Array(Dynamic)
            - Array(JSON)
          maxDynamicTypes: 4
          branches:
            json:
              name: team
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 2
              branches:
                json:
                  name: branch
                  availableTypes:
                    - String
                  maxDynamicTypes: 1
                  isTerminal: true
                  elemType: String
            dynamic:
              name: team
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 16
              maxDynamicPaths: 256
              branches:
                json:
                  name: branch
                  availableTypes:
                    - String
                  maxDynamicTypes: 8
                  maxDynamicPaths: 64
                  isTerminal: true
                  elemType: String
        dynamic:
          name: participated
          availableTypes:
            - Array(Dynamic)
            - Array(JSON)
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          branches:
            json:
              name: team
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 8
              maxDynamicPaths: 64
              branches:
                json:
                  name: branch
                  availableTypes:
                    - String
                  maxDynamicTypes: 4
                  maxDynamicPaths: 16
                  isTerminal: true
                  elemType: String
            dynamic:
              name: team
              availableTypes:
                - Array(JSON)
              maxDynamicTypes: 16
              maxDynamicPaths: 256
              branches:
                json:
                  name: branch
                  availableTypes:
                    - String
                  maxDynamicTypes: 8
                  maxDynamicPaths: 64
                  isTerminal: true
                  elemType: String
`

	got := plansToYAML(t, key.JSONPlan)
	require.YAMLEq(t, expectedYAML, got)
}
