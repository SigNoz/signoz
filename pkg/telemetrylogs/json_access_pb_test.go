package telemetrylogs

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// ============================================================================
// Helper Functions for Test Data Creation
// ============================================================================

// makeKey creates a TelemetryFieldKey for testing
func makeKey(name string, dataType telemetrytypes.JSONDataType, materialized bool) *telemetrytypes.TelemetryFieldKey {
	return &telemetrytypes.TelemetryFieldKey{
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
	ValueType       string                         `yaml:"valueType,omitempty"`
	AvailableTypes  []string                       `yaml:"availableTypes,omitempty"`
	Branches        map[string]*jsonAccessTestNode `yaml:"branches,omitempty"`
}

// toTestNode converts a JSONAccessNode tree into jsonAccessTestNode so that
// it can be serialized to YAML for easy visual comparison in tests.
func toTestNode(n *telemetrytypes.JSONAccessNode) *jsonAccessTestNode {
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
		out.ValueType = n.TerminalConfig.ValueType.StringValue()
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
func plansToYAML(t *testing.T, plans []*telemetrytypes.JSONAccessNode) string {
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
		node     *telemetrytypes.JSONAccessNode
		expected string
	}{
		{
			name:     "Root node returns name as-is",
			node:     telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			expected: LogsV2BodyJSONColumn,
		},
		{
			name: "Node without parent returns backticked name",
			node: &telemetrytypes.JSONAccessNode{
				Name:   "user",
				Parent: nil,
			},
			expected: "`user`",
		},
		{
			name: "Node with root parent uses dot separator",
			node: &telemetrytypes.JSONAccessNode{
				Name:   "age",
				Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			},
			expected: "`" + LogsV2BodyJSONColumn + ".age`",
		},
		{
			name: "Node with non-root parent uses array separator",
			node: &telemetrytypes.JSONAccessNode{
				Name: "name",
				Parent: &telemetrytypes.JSONAccessNode{
					Name:   "education",
					Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".education[].name`",
		},
		{
			name: "Nested array path with multiple levels",
			node: &telemetrytypes.JSONAccessNode{
				Name: "type",
				Parent: &telemetrytypes.JSONAccessNode{
					Name: "awards",
					Parent: &telemetrytypes.JSONAccessNode{
						Name:   "education",
						Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
					},
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".education[].awards[].type`",
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
		node     *telemetrytypes.JSONAccessNode
		expected string
	}{
		{
			name: "Simple field path from root",
			node: &telemetrytypes.JSONAccessNode{
				Name:   "user",
				Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			},
			// FieldPath() always wraps the field name in backticks
			expected: LogsV2BodyJSONColumn + ".`user`",
		},
		{
			name: "Field path with backtick-required key",
			node: &telemetrytypes.JSONAccessNode{
				Name:   "user-name", // requires backtick
				Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			},
			expected: LogsV2BodyJSONColumn + ".`user-name`",
		},
		{
			name: "Nested field path",
			node: &telemetrytypes.JSONAccessNode{
				Name: "age",
				Parent: &telemetrytypes.JSONAccessNode{
					Name:   "user",
					Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
				},
			},
			// FieldPath() always wraps the field name in backticks
			expected: "`" + LogsV2BodyJSONColumn + ".user`.`age`",
		},
		{
			name: "Array element field path",
			node: &telemetrytypes.JSONAccessNode{
				Name: "name",
				Parent: &telemetrytypes.JSONAccessNode{
					Name:   "education",
					Parent: telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
				},
			},
			// FieldPath() always wraps the field name in backticks
			expected: "`" + LogsV2BodyJSONColumn + ".education`.`name`",
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
	_, metadataStore := testTypeSet()

	tests := []struct {
		name         string
		key          *telemetrytypes.TelemetryFieldKey
		expectErr    bool
		expectedYAML string
	}{
		{
			name: "Simple path not promoted",
			key:  makeKey("user.name", telemetrytypes.String, false),
			expectedYAML: `
- name: user.name
  column: body_json
  availableTypes:
    - String
  maxDynamicTypes: 16
  isTerminal: true
  elemType: String
  valueType: String
`,
		},
		{
			name: "Simple path promoted",
			key:  makeKey("user.name", telemetrytypes.String, true),
			expectedYAML: `
- name: user.name
  column: body_json
  availableTypes:
    - String
  maxDynamicTypes: 16
  isTerminal: true
  elemType: String
  valueType: String
- name: user.name
  column: body_json_promoted
  availableTypes:
    - String
  maxDynamicTypes: 16
  maxDynamicPaths: 256
  isTerminal: true
  elemType: String
  valueType: String
`,
		},
		{
			name:         "Empty path returns error",
			key:          makeKey("", telemetrytypes.String, false),
			expectErr:    true,
			expectedYAML: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plans, err := PlanJSON(context.Background(), tt.key, qbtypes.FilterOperatorEqual, "John", metadataStore)
			if tt.expectErr {
				require.Error(t, err)
				require.Nil(t, plans)
				return
			}
			require.NoError(t, err)
			got := plansToYAML(t, plans)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_ArrayPaths(t *testing.T) {
	_, metadataStore := testTypeSet()

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
      valueType: String
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
          valueType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
          valueType: String
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
                          valueType: String
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
      valueType: String
`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := makeKey(tt.path, telemetrytypes.String, false)
			plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, "John", metadataStore)
			require.NoError(t, err)
			require.NotNil(t, plans)
			require.Len(t, plans, 1)
			got := plansToYAML(t, plans)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_PromotedVsNonPromoted(t *testing.T) {
	_, metadataStore := testTypeSet()
	path := "education[].awards[].type"
	value := "sports"

	t.Run("Non-promoted plan", func(t *testing.T) {
		key := makeKey(path, telemetrytypes.String, false)
		plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, value, metadataStore)
		require.NoError(t, err)
		require.Len(t, plans, 1)

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
          valueType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
          valueType: String
`
		got := plansToYAML(t, plans)
		require.YAMLEq(t, expectedYAML, got)
	})

	t.Run("Promoted plan", func(t *testing.T) {
		key := makeKey(path, telemetrytypes.String, true)
		plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, value, metadataStore)
		require.NoError(t, err)
		require.Len(t, plans, 2)

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
          valueType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
          valueType: String
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
          valueType: String
        dynamic:
          name: type
          availableTypes:
            - String
          maxDynamicTypes: 16
          maxDynamicPaths: 256
          isTerminal: true
          elemType: String
          valueType: String
`
		got := plansToYAML(t, plans)
		require.YAMLEq(t, expectedYAML, got)
	})
}

func TestPlanJSON_EdgeCases(t *testing.T) {
	_, metadataStore := testTypeSet()

	tests := []struct {
		name         string
		path         string
		value        any
		expectedYAML string
	}{
		{
			name:  "Path with no available types",
			path:  "unknown.path",
			value: "test",
			expectedYAML: `
- name: unknown.path
  column: body_json
  maxDynamicTypes: 16
  isTerminal: true
  elemType: String
  valueType: String
`,
		},
		{
			name:  "Very deep nesting - validates progression doesn't go negative",
			path:  "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
			value: "Engineer",
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
                          valueType: String
`,
		},
		{
			name:  "Path with mixed scalar and array types",
			path:  "education[].type",
			value: "high_school",
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
      valueType: String
`,
		},
		{
			name:  "Exists with only array types available",
			path:  "education",
			value: nil,
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
			keyType := telemetrytypes.String
			switch tt.path {
			case "education":
				keyType = telemetrytypes.ArrayJSON
			case "education[].type":
				keyType = telemetrytypes.String
			}
			key := makeKey(tt.path, keyType, false)
			plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, tt.value, metadataStore)
			require.NoError(t, err)
			got := plansToYAML(t, plans)
			require.YAMLEq(t, tt.expectedYAML, got)
		})
	}
}

func TestPlanJSON_TreeStructure(t *testing.T) {
	_, metadataStore := testTypeSet()
	path := "education[].awards[].participated[].team[].branch"
	key := makeKey(path, telemetrytypes.String, false)
	plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, "John", metadataStore)
	require.NoError(t, err)
	require.Len(t, plans, 1)

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
                  valueType: String
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
                  valueType: String
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
                  valueType: String
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
                  valueType: String
`

	got := plansToYAML(t, plans)
	require.YAMLEq(t, expectedYAML, got)
}

// ============================================================================
// Test Data Setup
// ============================================================================

// testTypeSet returns a map of path->types and a mock MetadataStore for testing
// This represents the type information available in the test JSON structure
func testTypeSet() (map[string][]telemetrytypes.JSONDataType, telemetrytypes.MetadataStore) {
	types := map[string][]telemetrytypes.JSONDataType{
		"user.name":                                           {telemetrytypes.String},
		"user.age":                                            {telemetrytypes.Int64, telemetrytypes.String},
		"user.height":                                         {telemetrytypes.Float64},
		"education":                                           {telemetrytypes.ArrayJSON},
		"education[].name":                                    {telemetrytypes.String},
		"education[].type":                                    {telemetrytypes.String, telemetrytypes.Int64},
		"education[].internal_type":                           {telemetrytypes.String},
		"education[].metadata.location":                       {telemetrytypes.String},
		"education[].parameters":                              {telemetrytypes.ArrayFloat64, telemetrytypes.ArrayDynamic},
		"education[].duration":                                {telemetrytypes.String},
		"education[].mode":                                    {telemetrytypes.String},
		"education[].year":                                    {telemetrytypes.Int64},
		"education[].field":                                   {telemetrytypes.String},
		"education[].awards":                                  {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education[].awards[].name":                           {telemetrytypes.String},
		"education[].awards[].rank":                           {telemetrytypes.Int64},
		"education[].awards[].medal":                          {telemetrytypes.String},
		"education[].awards[].type":                           {telemetrytypes.String},
		"education[].awards[].semester":                       {telemetrytypes.Int64},
		"education[].awards[].participated":                   {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education[].awards[].participated[].type":            {telemetrytypes.String},
		"education[].awards[].participated[].field":           {telemetrytypes.String},
		"education[].awards[].participated[].project_type":    {telemetrytypes.String},
		"education[].awards[].participated[].project_name":    {telemetrytypes.String},
		"education[].awards[].participated[].race_type":       {telemetrytypes.String},
		"education[].awards[].participated[].team_based":      {telemetrytypes.Bool},
		"education[].awards[].participated[].team_name":       {telemetrytypes.String},
		"education[].awards[].participated[].team":            {telemetrytypes.ArrayJSON},
		"education[].awards[].participated[].team[].name":     {telemetrytypes.String},
		"education[].awards[].participated[].team[].branch":   {telemetrytypes.String},
		"education[].awards[].participated[].team[].semester": {telemetrytypes.Int64},
		"interests":                                                                  {telemetrytypes.ArrayJSON},
		"interests[].type":                                                           {telemetrytypes.String},
		"interests[].entities":                                                       {telemetrytypes.ArrayJSON},
		"interests[].entities.application_date":                                      {telemetrytypes.String},
		"interests[].entities[].reviews":                                             {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].given_by":                                  {telemetrytypes.String},
		"interests[].entities[].reviews[].remarks":                                   {telemetrytypes.String},
		"interests[].entities[].reviews[].weight":                                    {telemetrytypes.Float64},
		"interests[].entities[].reviews[].passed":                                    {telemetrytypes.Bool},
		"interests[].entities[].reviews[].type":                                      {telemetrytypes.String},
		"interests[].entities[].reviews[].analysis_type":                             {telemetrytypes.Int64},
		"interests[].entities[].reviews[].entries":                                   {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].subject":                         {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].status":                          {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata":                        {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].company":              {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].experience":           {telemetrytypes.Int64},
		"interests[].entities[].reviews[].entries[].metadata[].unit":                 {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions":            {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":     {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].duration": {telemetrytypes.Int64, telemetrytypes.Float64},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].unit":     {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings":  {telemetrytypes.ArrayInt64, telemetrytypes.ArrayString},
		"message": {telemetrytypes.String},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	for path, dataTypes := range types {
		for _, dataType := range dataTypes {
			mockMetadataStore.SetKey(&telemetrytypes.TelemetryFieldKey{
				Name:          path,
				JSONDataType:  &dataType,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.MappingJSONDataTypeToFieldDataType[dataType],
			})
		}
	}
	return types, mockMetadataStore
}
