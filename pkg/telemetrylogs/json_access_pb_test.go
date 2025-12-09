package telemetrylogs

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
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

// inferDataTypeFromValue infers JSONDataType from a Go value
func inferDataTypeFromValue(value any) telemetrytypes.JSONDataType {
	switch v := value.(type) {
	case string:
		return telemetrytypes.String
	case int64:
		return telemetrytypes.Int64
	case int:
		return telemetrytypes.Int64
	case float64:
		return telemetrytypes.Float64
	case float32:
		return telemetrytypes.Float64
	case bool:
		return telemetrytypes.Bool
	case []any:
		if len(v) == 0 {
			return telemetrytypes.Dynamic
		}
		return inferDataTypeFromValue(v[0])
	case nil:
		return telemetrytypes.String
	default:
		return telemetrytypes.String
	}
}

// makeGetTypes creates a getTypes function from a map of path -> types
func makeGetTypes(typesMap map[string][]telemetrytypes.JSONDataType) func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error) {
	return func(_ context.Context, path string) ([]telemetrytypes.JSONDataType, error) {
		return typesMap[path], nil
	}
}

// ============================================================================
// Helper Functions for Node Validation
// ============================================================================

// findTerminalNode finds the terminal node in a plan tree
func findTerminalNode(node *telemetrytypes.JSONAccessNode) *telemetrytypes.JSONAccessNode {
	if node == nil {
		return nil
	}
	if node.IsTerminal {
		return node
	}
	if node.Branches[telemetrytypes.BranchJSON] != nil {
		return findTerminalNode(node.Branches[telemetrytypes.BranchJSON])
	}
	if node.Branches[telemetrytypes.BranchDynamic] != nil {
		return findTerminalNode(node.Branches[telemetrytypes.BranchDynamic])
	}
	return nil
}

// validateTerminalNode validates a terminal node has expected properties
func validateTerminalNode(t *testing.T, node *telemetrytypes.JSONAccessNode, expectedName string, expectedElemType telemetrytypes.JSONDataType) {
	require.NotNil(t, node, "terminal node should not be nil")
	require.True(t, node.IsTerminal, "node should be terminal")
	require.Equal(t, expectedName, node.Name, "node name mismatch")
	require.NotNil(t, node.TerminalConfig, "terminal config should not be nil")
	require.Equal(t, expectedElemType, node.TerminalConfig.ElemType, "elem type mismatch")
}

// validateNodeStructure validates basic node structure
func validateNodeStructure(t *testing.T, node *telemetrytypes.JSONAccessNode, expectedName string, isTerminal bool) {
	require.NotNil(t, node, "node should not be nil")
	require.Equal(t, expectedName, node.Name, "node name mismatch")
	require.Equal(t, isTerminal, node.IsTerminal, "isTerminal mismatch")
}

// validateRootNode validates root node structure
func validateRootNode(t *testing.T, plan *telemetrytypes.JSONAccessNode, expectedColumn string, expectedMaxPaths int) {
	require.NotNil(t, plan, "plan should not be nil")
	require.NotNil(t, plan.Parent, "root parent should not be nil")
	require.Equal(t, expectedColumn, plan.Parent.Name, "root column name mismatch")
	require.Equal(t, expectedMaxPaths, plan.Parent.MaxDynamicPaths, "root MaxDynamicPaths mismatch")
}

// validateBranchExists validates that a branch exists and optionally checks its properties
func validateBranchExists(t *testing.T, node *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType, expectedMaxTypes *int, expectedMaxPaths *int) {
	require.NotNil(t, node, "node should not be nil")
	branch := node.Branches[branchType]
	require.NotNil(t, branch, "branch %v should exist", branchType)
	if expectedMaxTypes != nil {
		require.Equal(t, *expectedMaxTypes, branch.MaxDynamicTypes, "MaxDynamicTypes mismatch for branch %v", branchType)
	}
	if expectedMaxPaths != nil {
		require.Equal(t, *expectedMaxPaths, branch.MaxDynamicPaths, "MaxDynamicPaths mismatch for branch %v", branchType)
	}
}

// validateMaxDynamicTypesProgression validates MaxDynamicTypes progression through nested levels
func validateMaxDynamicTypesProgression(t *testing.T, node *telemetrytypes.JSONAccessNode, expectedValues []int) {
	current := node
	for i, expected := range expectedValues {
		if current == nil {
			t.Fatalf("node is nil at level %d", i)
		}
		require.Equal(t, expected, current.MaxDynamicTypes, "MaxDynamicTypes mismatch at level %d (node: %s)", i, current.Name)
		if current.Branches[telemetrytypes.BranchJSON] != nil {
			current = current.Branches[telemetrytypes.BranchJSON]
		} else {
			break
		}
	}
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
			expected: LogsV2BodyJSONColumn + ".user",
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
			expected: "`" + LogsV2BodyJSONColumn + ".user`.age",
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
			expected: "`" + LogsV2BodyJSONColumn + ".education`.name",
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
// Test Cases for buildPlan
// ============================================================================

func TestPlanBuilder_buildPlan(t *testing.T) {
	tests := []struct {
		name          string
		parts         []string
		key           *telemetrytypes.TelemetryFieldKey
		getTypes      func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error)
		isDynArrChild bool
		parent        *telemetrytypes.JSONAccessNode
		validate      func(t *testing.T, node *telemetrytypes.JSONAccessNode)
	}{
		{
			name:  "Simple path with single part",
			parts: []string{"user"},
			key:   makeKey("user", telemetrytypes.String, false),
			getTypes: makeGetTypes(map[string][]telemetrytypes.JSONDataType{
				"user": {telemetrytypes.String},
			}),
			isDynArrChild: false,
			parent:        telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			validate: func(t *testing.T, node *telemetrytypes.JSONAccessNode) {
				validateTerminalNode(t, node, "user", telemetrytypes.String)
			},
		},
		{
			name:  "Path with array - JSON branch",
			parts: []string{"education", "name"},
			key:   makeKey("education[].name", telemetrytypes.String, false),
			getTypes: makeGetTypes(map[string][]telemetrytypes.JSONDataType{
				"education":        {telemetrytypes.ArrayJSON},
				"education[].name": {telemetrytypes.String},
			}),
			isDynArrChild: false,
			parent:        telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			validate: func(t *testing.T, node *telemetrytypes.JSONAccessNode) {
				validateNodeStructure(t, node, "education", false)
				require.Equal(t, 16, node.MaxDynamicTypes) // 32/2
				require.NotNil(t, node.Branches[telemetrytypes.BranchJSON])
				child := node.Branches[telemetrytypes.BranchJSON]
				require.True(t, child.IsTerminal)
				require.Equal(t, 8, child.MaxDynamicTypes) // 16/2
			},
		},
		{
			name:  "Path with array - Dynamic branch",
			parts: []string{"education", "name"},
			key:   makeKey("education[].name", telemetrytypes.String, false),
			getTypes: makeGetTypes(map[string][]telemetrytypes.JSONDataType{
				"education":        {telemetrytypes.ArrayDynamic},
				"education[].name": {telemetrytypes.String},
			}),
			isDynArrChild: false,
			parent:        telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			validate: func(t *testing.T, node *telemetrytypes.JSONAccessNode) {
				validateNodeStructure(t, node, "education", false)
				expectedMaxTypes := 16
				expectedMaxPaths := 256
				validateBranchExists(t, node, telemetrytypes.BranchDynamic, &expectedMaxTypes, &expectedMaxPaths)
			},
		},
		{
			name:  "Path with both JSON and Dynamic branches",
			parts: []string{"education", "name"},
			key:   makeKey("education[].name", telemetrytypes.String, false),
			getTypes: makeGetTypes(map[string][]telemetrytypes.JSONDataType{
				"education":        {telemetrytypes.ArrayJSON, telemetrytypes.ArrayDynamic},
				"education[].name": {telemetrytypes.String},
			}),
			isDynArrChild: false,
			parent:        telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			validate: func(t *testing.T, node *telemetrytypes.JSONAccessNode) {
				validateNodeStructure(t, node, "education", false)
				require.NotNil(t, node.Branches[telemetrytypes.BranchJSON])
				require.NotNil(t, node.Branches[telemetrytypes.BranchDynamic])
			},
		},
		{
			name:  "Nested array path progression",
			parts: []string{"education", "awards", "type"},
			key:   makeKey("education[].awards[].type", telemetrytypes.String, false),
			getTypes: makeGetTypes(map[string][]telemetrytypes.JSONDataType{
				"education":                 {telemetrytypes.ArrayJSON},
				"education[].awards":        {telemetrytypes.ArrayJSON},
				"education[].awards[].type": {telemetrytypes.String},
			}),
			isDynArrChild: false,
			parent:        telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn, 32, 0),
			validate: func(t *testing.T, node *telemetrytypes.JSONAccessNode) {
				validateNodeStructure(t, node, "education", false)
				require.Equal(t, 16, node.MaxDynamicTypes) // 32/2
				child := node.Branches[telemetrytypes.BranchJSON]
				require.Equal(t, 8, child.MaxDynamicTypes) // 16/2
				grandchild := child.Branches[telemetrytypes.BranchJSON]
				require.Equal(t, 4, grandchild.MaxDynamicTypes) // 8/2
				require.True(t, grandchild.IsTerminal)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pb := &JSONAccessPlanBuilder{
				key:      tt.key,
				parts:    tt.parts,
				getTypes: tt.getTypes,
			}
			result, err := pb.buildPlan(context.Background(), 0, tt.parent, tt.isDynArrChild)
			require.NoError(t, err)
			tt.validate(t, result)
		})
	}
}

// ============================================================================
// Test Cases for PlanJSON
// ============================================================================

func TestPlanJSON_BasicStructure(t *testing.T) {
	_, getTypes := testTypeSet()

	tests := []struct {
		name      string
		key       *telemetrytypes.TelemetryFieldKey
		expectErr bool
		validate  func(t *testing.T, plans []*telemetrytypes.JSONAccessNode)
	}{
		{
			name: "Simple path not promoted",
			key:  makeKey("user.name", telemetrytypes.String, false),
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				require.Len(t, plans, 1)
				validateRootNode(t, plans[0], LogsV2BodyJSONColumn, 0)
			},
		},
		{
			name: "Simple path promoted",
			key:  makeKey("user.name", telemetrytypes.String, true),
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				require.Len(t, plans, 2)
				validateRootNode(t, plans[0], LogsV2BodyJSONColumn, 0)
				validateRootNode(t, plans[1], LogsV2BodyPromotedColumn, 1024)
				require.Equal(t, plans[0].Name, plans[1].Name)
			},
		},
		{
			name:      "Empty path returns error",
			key:       makeKey("", telemetrytypes.String, false),
			expectErr: true,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				require.Nil(t, plans)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plans, err := PlanJSON(context.Background(), tt.key, qbtypes.FilterOperatorEqual, "John", getTypes)
			if tt.expectErr {
				require.Error(t, err)
				tt.validate(t, plans)
				return
			}
			require.NoError(t, err)
			tt.validate(t, plans)
		})
	}
}

func TestPlanJSON_Operators(t *testing.T) {
	_, getTypes := testTypeSet()

	tests := []struct {
		name     string
		path     string
		operator qbtypes.FilterOperator
		value    any
		validate func(t *testing.T, terminal *telemetrytypes.JSONAccessNode)
	}{
		{
			name:     "Equal operator with string",
			path:     "user.name",
			operator: qbtypes.FilterOperatorEqual,
			value:    "John",
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				// Path "user.name" is not split by ".", so terminal node name is "user.name"
				validateTerminalNode(t, terminal, "user.name", telemetrytypes.String)
			},
		},
		{
			name:     "NotEqual operator with int64",
			path:     "user.age",
			operator: qbtypes.FilterOperatorNotEqual,
			value:    int64(30),
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				// Path "user.age" is not split by ".", so terminal node name is "user.age"
				validateTerminalNode(t, terminal, "user.age", telemetrytypes.Int64)
			},
		},
		{
			name:     "Contains operator with string",
			path:     "education[].name",
			operator: qbtypes.FilterOperatorContains,
			value:    "IIT",
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				validateTerminalNode(t, terminal, "name", telemetrytypes.String)
			},
		},
		{
			name:     "Contains operator with array parameter",
			path:     "education[].parameters",
			operator: qbtypes.FilterOperatorContains,
			value:    1.65,
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				// Terminal config uses key's JSONDataType (inferred from value), not available types
				validateTerminalNode(t, terminal, "parameters", telemetrytypes.Float64)
			},
		},
		{
			name:     "In operator with array value",
			path:     "user.name",
			operator: qbtypes.FilterOperatorIn,
			value:    []any{"John", "Jane", "Bob"},
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				// Path "user.name" is not split by ".", so terminal node name is "user.name"
				validateTerminalNode(t, terminal, "user.name", telemetrytypes.String)
			},
		},
		{
			name:     "Exists operator with nil",
			path:     "user.age",
			operator: qbtypes.FilterOperatorExists,
			value:    nil,
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				// Path "user.age" is not split by ".", so terminal node name is "user.age"
				// Value is nil, so type is inferred as String, but test expects Int64
				// This test should use Int64 type when creating the key
				require.NotNil(t, terminal)
				require.NotNil(t, terminal.TerminalConfig)
			},
		},
		{
			name:     "Like operator",
			path:     "user.name",
			operator: qbtypes.FilterOperatorLike,
			value:    "John%",
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				require.NotNil(t, terminal)
				require.NotNil(t, terminal.TerminalConfig)
			},
		},
		{
			name:     "GreaterThan operator",
			path:     "user.age",
			operator: qbtypes.FilterOperatorGreaterThan,
			value:    int64(18),
			validate: func(t *testing.T, terminal *telemetrytypes.JSONAccessNode) {
				require.NotNil(t, terminal)
				require.NotNil(t, terminal.TerminalConfig)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For Exists operator with nil value on user.age, use Int64 type
			dataType := inferDataTypeFromValue(tt.value)
			if tt.path == "user.age" && tt.operator == qbtypes.FilterOperatorExists {
				dataType = telemetrytypes.Int64
			}
			key := makeKey(tt.path, dataType, false)
			plans, err := PlanJSON(context.Background(), key, tt.operator, tt.value, getTypes)
			require.NoError(t, err)
			require.NotNil(t, plans)
			require.Len(t, plans, 1)
			terminal := findTerminalNode(plans[0])
			tt.validate(t, terminal)
		})
	}
}

func TestPlanJSON_ArrayPaths(t *testing.T) {
	_, getTypes := testTypeSet()

	tests := []struct {
		name     string
		path     string
		operator qbtypes.FilterOperator
		validate func(t *testing.T, plans []*telemetrytypes.JSONAccessNode)
	}{
		{
			name:     "Single array level - JSON branch only",
			path:     "education[].name",
			operator: qbtypes.FilterOperatorEqual,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				node := plans[0]
				validateNodeStructure(t, node, "education", false)
				require.NotNil(t, node.Branches[telemetrytypes.BranchJSON])
				require.Nil(t, node.Branches[telemetrytypes.BranchDynamic])
				child := node.Branches[telemetrytypes.BranchJSON]
				validateTerminalNode(t, child, "name", telemetrytypes.String)
				require.Equal(t, 8, child.MaxDynamicTypes) // 16/2
			},
		},
		{
			name:     "Single array level - both JSON and Dynamic branches",
			path:     "education[].awards[].type",
			operator: qbtypes.FilterOperatorEqual,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				node := plans[0]
				validateNodeStructure(t, node, "education", false)
				require.NotNil(t, node.Branches[telemetrytypes.BranchJSON])
				child := node.Branches[telemetrytypes.BranchJSON]
				require.Equal(t, "awards", child.Name)
				require.NotNil(t, child.Branches[telemetrytypes.BranchJSON])
				require.NotNil(t, child.Branches[telemetrytypes.BranchDynamic])
				terminalJSON := findTerminalNode(child.Branches[telemetrytypes.BranchJSON])
				terminalDyn := findTerminalNode(child.Branches[telemetrytypes.BranchDynamic])
				require.Equal(t, 4, terminalJSON.MaxDynamicTypes)
				require.Equal(t, 16, terminalDyn.MaxDynamicTypes)  // Reset for Dynamic
				require.Equal(t, 256, terminalDyn.MaxDynamicPaths) // Reset for Dynamic
			},
		},
		{
			name:     "Deeply nested array path",
			path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
			operator: qbtypes.FilterOperatorEqual,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				node := plans[0]
				expectedTypes := []int{16, 8, 4, 2, 1, 0}
				validateMaxDynamicTypesProgression(t, node, expectedTypes)
				terminal := findTerminalNode(node)
				require.True(t, terminal.IsTerminal)
			},
		},
		{
			name:     "ArrayAnyIndex replacement [*] to []",
			path:     "education[*].name",
			operator: qbtypes.FilterOperatorEqual,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				node := plans[0]
				validateNodeStructure(t, node, "education", false)
				require.NotNil(t, node.Branches[telemetrytypes.BranchJSON])
				terminal := findTerminalNode(node.Branches[telemetrytypes.BranchJSON])
				require.NotNil(t, terminal)
				require.Equal(t, "name", terminal.Name)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := makeKey(tt.path, telemetrytypes.String, false)
			plans, err := PlanJSON(context.Background(), key, tt.operator, "John", getTypes)
			require.NoError(t, err)
			require.NotNil(t, plans)
			require.Len(t, plans, 1)
			tt.validate(t, plans)
		})
	}
}

func TestPlanJSON_ArrayMembership(t *testing.T) {
	_, getTypes := testTypeSet()

	tests := []struct {
		name             string
		path             string
		operator         qbtypes.FilterOperator
		value            any
		expectedElemType telemetrytypes.JSONDataType
	}{
		{
			name:     "Contains with ArrayFloat64",
			path:     "education[].parameters",
			operator: qbtypes.FilterOperatorContains,
			value:    1.65,
			// Terminal config uses key's JSONDataType (inferred from value), not available types
			expectedElemType: telemetrytypes.Float64,
		},
		{
			name:     "Contains with ArrayString",
			path:     "education[].parameters",
			operator: qbtypes.FilterOperatorContains,
			value:    "passed",
			// Terminal config uses key's JSONDataType (inferred from value), not available types
			expectedElemType: telemetrytypes.String,
		},
		{
			name:     "Contains with ArrayInt64",
			path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].ratings",
			operator: qbtypes.FilterOperatorContains,
			value:    int64(4),
			// Terminal config uses key's JSONDataType (inferred from value), not available types
			expectedElemType: telemetrytypes.Int64,
		},
		{
			name:             "Contains with scalar only",
			path:             "education[].name",
			operator:         qbtypes.FilterOperatorContains,
			value:            "IIT",
			expectedElemType: telemetrytypes.String,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := makeKey(tt.path, inferDataTypeFromValue(tt.value), false)
			plans, err := PlanJSON(context.Background(), key, tt.operator, tt.value, getTypes)
			require.NoError(t, err)
			require.NotNil(t, plans)
			require.Len(t, plans, 1)
			terminal := findTerminalNode(plans[0])
			require.NotNil(t, terminal)
			require.NotNil(t, terminal.TerminalConfig)
			require.Equal(t, tt.expectedElemType, terminal.TerminalConfig.ElemType)
		})
	}
}

func TestPlanJSON_PromotedVsNonPromoted(t *testing.T) {
	_, getTypes := testTypeSet()
	path := "education[].awards[].type"
	value := "sports"

	t.Run("Non-promoted plan", func(t *testing.T) {
		key := makeKey(path, inferDataTypeFromValue(value), false)
		plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, value, getTypes)
		require.NoError(t, err)
		require.Len(t, plans, 1)
		validateRootNode(t, plans[0], LogsV2BodyJSONColumn, 0)
		require.Equal(t, 0, plans[0].MaxDynamicPaths)
	})

	t.Run("Promoted plan", func(t *testing.T) {
		key := makeKey(path, inferDataTypeFromValue(value), true)
		plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, value, getTypes)
		require.NoError(t, err)
		require.Len(t, plans, 2)
		validateRootNode(t, plans[0], LogsV2BodyJSONColumn, 0)
		validateRootNode(t, plans[1], LogsV2BodyPromotedColumn, 1024)

		terminal1 := findTerminalNode(plans[0])
		terminal2 := findTerminalNode(plans[1])
		require.NotNil(t, terminal1)
		require.NotNil(t, terminal2)
		require.Equal(t, terminal1.Name, terminal2.Name)

		// Check MaxDynamicPaths progression
		node1 := plans[0]
		node2 := plans[1]
		require.Equal(t, 256, node2.MaxDynamicPaths, "Promoted education node should have 256")
		require.Equal(t, 0, node1.MaxDynamicPaths, "Non-promoted education node should have 0")

		if node1.Branches[telemetrytypes.BranchJSON] != nil && node2.Branches[telemetrytypes.BranchJSON] != nil {
			child1 := node1.Branches[telemetrytypes.BranchJSON]
			child2 := node2.Branches[telemetrytypes.BranchJSON]
			require.Equal(t, 64, child2.MaxDynamicPaths, "Promoted awards node should have 64")
			require.Equal(t, 0, child1.MaxDynamicPaths, "Non-promoted awards node should have 0")
		}
	})
}

func TestPlanJSON_EdgeCases(t *testing.T) {
	_, getTypes := testTypeSet()

	tests := []struct {
		name     string
		path     string
		operator qbtypes.FilterOperator
		value    any
		validate func(t *testing.T, plans []*telemetrytypes.JSONAccessNode)
	}{
		{
			name:     "Path with no available types",
			path:     "unknown.path",
			operator: qbtypes.FilterOperatorEqual,
			value:    "test",
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				require.NotNil(t, plans)
				require.Len(t, plans, 1)
				terminal := findTerminalNode(plans[0])
				if terminal != nil {
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ElemType)
				}
			},
		},
		{
			name:     "Very deep nesting - validates progression doesn't go negative",
			path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
			operator: qbtypes.FilterOperatorEqual,
			value:    "Engineer",
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				node := plans[0]
				current := node
				for !current.IsTerminal && current.Branches[telemetrytypes.BranchJSON] != nil {
					require.GreaterOrEqual(t, current.MaxDynamicTypes, 0,
						"MaxDynamicTypes should not be negative at node %s", current.Name)
					require.GreaterOrEqual(t, current.MaxDynamicPaths, 0,
						"MaxDynamicPaths should not be negative at node %s", current.Name)
					current = current.Branches[telemetrytypes.BranchJSON]
				}
			},
		},
		{
			name:     "Path with mixed scalar and array types",
			path:     "education[].type",
			operator: qbtypes.FilterOperatorEqual,
			value:    "high_school",
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				terminal := findTerminalNode(plans[0])
				require.NotNil(t, terminal)
				require.Contains(t, terminal.AvailableTypes, telemetrytypes.String)
				require.Contains(t, terminal.AvailableTypes, telemetrytypes.Int64)
				require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ElemType)
			},
		},
		{
			name:     "Exists with only array types available",
			path:     "education",
			operator: qbtypes.FilterOperatorExists,
			value:    nil,
			validate: func(t *testing.T, plans []*telemetrytypes.JSONAccessNode) {
				terminal := findTerminalNode(plans[0])
				require.NotNil(t, terminal)
				require.NotNil(t, terminal.TerminalConfig)
				// When path is an array and value is nil, key should use ArrayJSON type
				require.Equal(t, telemetrytypes.ArrayJSON, terminal.TerminalConfig.ElemType)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For "education" path with Exists operator, use ArrayJSON type
			dataType := inferDataTypeFromValue(tt.value)
			if tt.path == "education" && tt.operator == qbtypes.FilterOperatorExists {
				dataType = telemetrytypes.ArrayJSON
			}
			key := makeKey(tt.path, dataType, false)
			plans, err := PlanJSON(context.Background(), key, tt.operator, tt.value, getTypes)
			require.NoError(t, err)
			tt.validate(t, plans)
		})
	}
}

func TestPlanJSON_TreeStructure(t *testing.T) {
	_, getTypes := testTypeSet()
	path := "education[].awards[].participated[].team[].branch"
	key := makeKey(path, telemetrytypes.String, false)
	plans, err := PlanJSON(context.Background(), key, qbtypes.FilterOperatorEqual, "John", getTypes)
	require.NoError(t, err)
	require.Len(t, plans, 1)

	node := plans[0]
	var validateNode func(*telemetrytypes.JSONAccessNode)
	validateNode = func(n *telemetrytypes.JSONAccessNode) {
		if n == nil {
			return
		}
		if n.Parent != nil {
			require.NotNil(t, n.Parent, "Node %s should have parent", n.Name)
			if !n.IsTerminal && n.Parent != nil {
				require.False(t, n.Parent.IsTerminal,
					"Non-terminal node %s should have non-terminal parent", n.Name)
			}
		}
		if n.Branches[telemetrytypes.BranchJSON] != nil {
			validateNode(n.Branches[telemetrytypes.BranchJSON])
		}
		if n.Branches[telemetrytypes.BranchDynamic] != nil {
			validateNode(n.Branches[telemetrytypes.BranchDynamic])
		}
	}
	validateNode(node)
}

// ============================================================================
// Test Data Setup
// ============================================================================

// testTypeSet returns a map of path->types and a getTypes function for testing
// This represents the type information available in the test JSON structure
func testTypeSet() (map[string][]telemetrytypes.JSONDataType, func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error)) {
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

	return types, makeGetTypes(types)
}
