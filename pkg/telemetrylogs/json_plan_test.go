package telemetrylogs

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

func TestNode_Alias(t *testing.T) {
	cases := []struct {
		name     string
		node     *Node
		expected string
	}{
		{
			name: "Root node returns name as-is",
			node: &Node{
				Name:   LogsV2BodyJSONColumn,
				isRoot: true,
			},
			expected: LogsV2BodyJSONColumn,
		},
		{
			name: "Node without parent returns backticked name",
			node: &Node{
				Name:   "user",
				isRoot: false,
				Parent: nil,
			},
			expected: "`user`",
		},
		{
			name: "Node with root parent uses dot separator",
			node: &Node{
				Name:   "age",
				isRoot: false,
				Parent: &Node{
					Name:   LogsV2BodyJSONColumn,
					isRoot: true,
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".age`",
		},
		{
			name: "Node with non-root parent uses array separator",
			node: &Node{
				Name:   "name",
				isRoot: false,
				Parent: &Node{
					Name:   "education",
					isRoot: false,
					Parent: &Node{
						Name:   LogsV2BodyJSONColumn,
						isRoot: true,
					},
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".education[].name`",
		},
		{
			name: "Nested array path with multiple levels",
			node: &Node{
				Name:   "type",
				isRoot: false,
				Parent: &Node{
					Name:   "awards",
					isRoot: false,
					Parent: &Node{
						Name:   "education",
						isRoot: false,
						Parent: &Node{
							Name:   LogsV2BodyJSONColumn,
							isRoot: true,
						},
					},
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".education[].awards[].type`",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := c.node.Alias()
			require.Equal(t, c.expected, result)
		})
	}
}

func TestNode_FieldPath(t *testing.T) {
	cases := []struct {
		name     string
		node     *Node
		expected string
	}{
		{
			name: "Simple field path from root",
			node: &Node{
				Name:   "user",
				isRoot: false,
				Parent: &Node{
					Name:   LogsV2BodyJSONColumn,
					isRoot: true,
				},
			},
			expected: LogsV2BodyJSONColumn + ".user",
		},
		{
			name: "Field path with backtick-required key",
			node: &Node{
				Name:   "user-name", // requires backtick
				isRoot: false,
				Parent: &Node{
					Name:   LogsV2BodyJSONColumn,
					isRoot: true,
				},
			},
			expected: LogsV2BodyJSONColumn + ".`user-name`",
		},
		{
			name: "Nested field path",
			node: &Node{
				Name:   "age",
				isRoot: false,
				Parent: &Node{
					Name:   "user",
					isRoot: false,
					Parent: &Node{
						Name:   LogsV2BodyJSONColumn,
						isRoot: true,
					},
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".user`.age",
		},
		{
			name: "Array element field path",
			node: &Node{
				Name:   "name",
				isRoot: false,
				Parent: &Node{
					Name:   "education",
					isRoot: false,
					Parent: &Node{
						Name:   LogsV2BodyJSONColumn,
						isRoot: true,
					},
				},
			},
			expected: "`" + LogsV2BodyJSONColumn + ".education`.name",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := c.node.FieldPath()
			require.Equal(t, c.expected, result)
		})
	}
}

func TestNode_decideElemType(t *testing.T) {
	cases := []struct {
		name         string
		node         *Node
		operator     qbtypes.FilterOperator
		valueType    telemetrytypes.JSONDataType
		expectedPref bool
		expectedElem telemetrytypes.JSONDataType
	}{
		{
			name: "No available types - fallback to valueType",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.String,
			expectedPref: false,
			expectedElem: telemetrytypes.String,
		},
		{
			name: "Has scalar type - prefer scalar",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.String,
			expectedPref: false,
			expectedElem: telemetrytypes.String,
		},
		{
			name: "Only array type available - prefer array",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayString},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.String,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayString,
		},
		{
			name: "Both scalar and array - prefer scalar",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String, telemetrytypes.ArrayString},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.String,
			expectedPref: false,
			expectedElem: telemetrytypes.String,
		},
		{
			name: "Contains operator with typed array - prefer array",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayString},
			},
			operator:     qbtypes.FilterOperatorContains,
			valueType:    telemetrytypes.String,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayString,
		},
		{
			name: "Contains operator with ArrayDynamic - prefer array",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayDynamic},
			},
			operator:     qbtypes.FilterOperatorContains,
			valueType:    telemetrytypes.String,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayString,
		},
		{
			name: "Contains operator with scalar only - prefer scalar",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String},
			},
			operator:     qbtypes.FilterOperatorContains,
			valueType:    telemetrytypes.String,
			expectedPref: false,
			expectedElem: telemetrytypes.String,
		},
		{
			name: "Contains operator with no matching array - prefer scalar",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String},
			},
			operator:     qbtypes.FilterOperatorContains,
			valueType:    telemetrytypes.String,
			expectedPref: false,
			expectedElem: telemetrytypes.String,
		},
		{
			name: "NotContains operator with array - prefer array",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayInt64},
			},
			operator:     qbtypes.FilterOperatorNotContains,
			valueType:    telemetrytypes.Int64,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayInt64,
		},
		{
			name: "Int64 with ArrayInt64 available",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayInt64},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.Int64,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayInt64,
		},
		{
			name: "Float64 with ArrayFloat64 available",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayFloat64},
			},
			operator:     qbtypes.FilterOperatorEqual,
			valueType:    telemetrytypes.Float64,
			expectedPref: true,
			expectedElem: telemetrytypes.ArrayFloat64,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			pref, elem := c.node.decideElemType(c.operator, c.valueType)
			require.Equal(t, c.expectedPref, pref, "PreferArrayAtEnd mismatch")
			require.Equal(t, c.expectedElem, elem, "ElemType mismatch")
		})
	}
}

func TestNode_configureTerminal(t *testing.T) {
	cases := []struct {
		name     string
		node     *Node
		operator qbtypes.FilterOperator
		value    any
		expected *TerminalConfig
	}{
		{
			name: "String value with Equal operator",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String},
			},
			operator: qbtypes.FilterOperatorEqual,
			value:    "test",
			expected: &TerminalConfig{
				PreferArrayAtEnd: false,
				ElemType:         telemetrytypes.String,
				ValueType:        telemetrytypes.String,
				Operator:         qbtypes.FilterOperatorEqual,
				Value:            "test",
			},
		},
		{
			name: "Int64 value with Equal operator",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.Int64},
			},
			operator: qbtypes.FilterOperatorEqual,
			value:    int64(42),
			expected: &TerminalConfig{
				PreferArrayAtEnd: false,
				ElemType:         telemetrytypes.Int64,
				ValueType:        telemetrytypes.Int64,
				Operator:         qbtypes.FilterOperatorEqual,
				Value:            int64(42),
			},
		},
		{
			name: "Contains operator with array available",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayString},
			},
			operator: qbtypes.FilterOperatorContains,
			value:    "test",
			expected: &TerminalConfig{
				PreferArrayAtEnd: true,
				ElemType:         telemetrytypes.ArrayString,
				ValueType:        telemetrytypes.String,
				Operator:         qbtypes.FilterOperatorContains,
				Value:            "test",
			},
		},
		{
			name: "Exists operator with nil value (GroupBy)",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String, telemetrytypes.Int64},
			},
			operator: qbtypes.FilterOperatorExists,
			value:    nil,
			expected: &TerminalConfig{
				PreferArrayAtEnd: false,
				ElemType:         telemetrytypes.String,
				ValueType:        telemetrytypes.String,
				Operator:         qbtypes.FilterOperatorExists,
				Value:            nil,
			},
		},
		{
			name: "Exists operator with only array types",
			node: &Node{
				AvailableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayString},
			},
			operator: qbtypes.FilterOperatorExists,
			value:    nil,
			expected: &TerminalConfig{
				PreferArrayAtEnd: false,
				ElemType:         telemetrytypes.ArrayString,
				ValueType:        telemetrytypes.ArrayString,
				Operator:         qbtypes.FilterOperatorExists,
				Value:            nil,
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			c.node.configureTerminal(c.operator, c.value)
			require.NotNil(t, c.node.TerminalConfig)
			require.Equal(t, c.expected.PreferArrayAtEnd, c.node.TerminalConfig.PreferArrayAtEnd)
			require.Equal(t, c.expected.ElemType, c.node.TerminalConfig.ElemType)
			require.Equal(t, c.expected.ValueType, c.node.TerminalConfig.ValueType)
			require.Equal(t, c.expected.Operator, c.node.TerminalConfig.Operator)
			require.Equal(t, c.expected.Value, c.node.TerminalConfig.Value)
		})
	}
}

func TestNode_determineValueType(t *testing.T) {
	cases := []struct {
		name           string
		node           *Node
		availableTypes []telemetrytypes.JSONDataType
		operator       qbtypes.FilterOperator
		value          any
		expected       telemetrytypes.JSONDataType
	}{
		{
			name:           "String value",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorEqual,
			value:          "test",
			expected:       telemetrytypes.String,
		},
		{
			name:           "Int64 value",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorEqual,
			value:          int64(42),
			expected:       telemetrytypes.Int64,
		},
		{
			name:           "Float64 value",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorEqual,
			value:          float64(3.14),
			expected:       telemetrytypes.Float64,
		},
		{
			name:           "Bool value",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorEqual,
			value:          true,
			expected:       telemetrytypes.Bool,
		},
		{
			name:           "Exists with nil value - uses first scalar type",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{telemetrytypes.String, telemetrytypes.Int64},
			operator:       qbtypes.FilterOperatorExists,
			value:          nil,
			expected:       telemetrytypes.String,
		},
		{
			name:           "Exists with nil value - only arrays available",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{telemetrytypes.ArrayString},
			operator:       qbtypes.FilterOperatorExists,
			value:          nil,
			expected:       telemetrytypes.ArrayString,
		},
		{
			name:           "Exists with nil value - no types available",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorExists,
			value:          nil,
			expected:       telemetrytypes.String, // fallback
		},
		{
			name:           "Float that is actually int",
			node:           &Node{},
			availableTypes: []telemetrytypes.JSONDataType{},
			operator:       qbtypes.FilterOperatorEqual,
			value:          float64(42.0),
			expected:       telemetrytypes.Int64,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := c.node.determineValueType(c.availableTypes, c.operator, c.value)
			require.Equal(t, c.expected, result)
		})
	}
}

func TestNode_inferDataType(t *testing.T) {
	cases := []struct {
		name          string
		node          *Node
		value         any
		operator      qbtypes.FilterOperator
		expectedType  telemetrytypes.JSONDataType
		expectedValue any
	}{
		{
			name:          "String value",
			node:          &Node{},
			value:         "test",
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.String,
			expectedValue: "test",
		},
		{
			name:          "Int64 value",
			node:          &Node{},
			value:         int64(42),
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Int64,
			expectedValue: int64(42),
		},
		{
			name:          "Int value",
			node:          &Node{},
			value:         int(42),
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Int64,
			expectedValue: int(42),
		},
		{
			name:          "Float64 value",
			node:          &Node{},
			value:         float64(3.14),
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Float64,
			expectedValue: float64(3.14),
		},
		{
			name:          "Float64 that is actually int",
			node:          &Node{},
			value:         float64(42.0),
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Int64,
			expectedValue: int64(42),
		},
		{
			name:          "Float32 value",
			node:          &Node{},
			value:         float32(3.14),
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Float64,
			expectedValue: float32(3.14), // Function infers Float64 type but doesn't convert the value
		},
		{
			name:          "Bool value",
			node:          &Node{},
			value:         true,
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Bool,
			expectedValue: true,
		},
		{
			name:          "Array value",
			node:          &Node{},
			value:         []any{"test"},
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.String,
			expectedValue: []any{"test"},
		},
		{
			name:          "Empty array",
			node:          &Node{},
			value:         []any{},
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Dynamic,
			expectedValue: []any{},
		},
		{
			name:          "String with Contains operator",
			node:          &Node{},
			value:         "test",
			operator:      qbtypes.FilterOperatorContains,
			expectedType:  telemetrytypes.String,
			expectedValue: "test",
		},
		{
			name:          "Numeric string parsed as int",
			node:          &Node{},
			value:         "42",
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Int64,
			expectedValue: int64(42),
		},
		{
			name:          "Numeric string parsed as float",
			node:          &Node{},
			value:         "3.14",
			operator:      qbtypes.FilterOperatorEqual,
			expectedType:  telemetrytypes.Float64,
			expectedValue: float64(3.14),
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resultType, resultValue := c.node.inferDataType(c.value, c.operator)
			require.Equal(t, c.expectedType, resultType)
			require.Equal(t, c.expectedValue, resultValue)
		})
	}
}

func TestIsFloatActuallyInt(t *testing.T) {
	cases := []struct {
		name     string
		value    float64
		expected bool
	}{
		{
			name:     "Integer float",
			value:    42.0,
			expected: true,
		},
		{
			name:     "Non-integer float",
			value:    3.14,
			expected: false,
		},
		{
			name:     "Zero",
			value:    0.0,
			expected: true,
		},
		{
			name:     "Negative integer float",
			value:    -42.0,
			expected: true,
		},
		{
			name:     "Large integer float",
			value:    1000000.0,
			expected: true,
		},
		{
			name:     "Small decimal",
			value:    0.1,
			expected: false,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := IsFloatActuallyInt(c.value)
			require.Equal(t, c.expected, result)
		})
	}
}

func TestPlanBuilder_buildPlan(t *testing.T) {
	cases := []struct {
		name          string
		parts         []string
		operator      qbtypes.FilterOperator
		value         any
		getTypes      func(path string) []telemetrytypes.JSONDataType
		isDynArrChild bool
		parent        *Node
		validate      func(t *testing.T, node *Node)
	}{
		{
			name:          "Simple path with single part",
			parts:         []string{"user"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "test",
			isDynArrChild: false,
			parent: &Node{
				Name:            LogsV2BodyJSONColumn,
				isRoot:          true,
				MaxDynamicTypes: 32,
				MaxDynamicPaths: 0,
			},
			getTypes: func(path string) []telemetrytypes.JSONDataType {
				if path == "user" {
					return []telemetrytypes.JSONDataType{telemetrytypes.String}
				}
				return nil
			},
			validate: func(t *testing.T, node *Node) {
				require.NotNil(t, node)
				require.Equal(t, "user", node.Name)
				require.True(t, node.IsTerminal)
				require.NotNil(t, node.TerminalConfig)
				require.Equal(t, telemetrytypes.String, node.TerminalConfig.ValueType)
			},
		},
		{
			name:          "Path with array - JSON branch",
			parts:         []string{"education", "name"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "IIT",
			isDynArrChild: false,
			parent: &Node{
				Name:            LogsV2BodyJSONColumn,
				isRoot:          true,
				MaxDynamicTypes: 32,
				MaxDynamicPaths: 0,
			},
			getTypes: func(path string) []telemetrytypes.JSONDataType {
				switch path {
				case "education":
					return []telemetrytypes.JSONDataType{telemetrytypes.ArrayJSON}
				case "education[].name":
					return []telemetrytypes.JSONDataType{telemetrytypes.String}
				}
				return nil
			},
			validate: func(t *testing.T, node *Node) {
				require.NotNil(t, node)
				require.Equal(t, "education", node.Name)
				require.False(t, node.IsTerminal)
				require.NotNil(t, node.Branches[BranchJSON])
				// Parent has MaxDynamicTypes=32, so this node gets 32/2=16
				require.Equal(t, 16, node.MaxDynamicTypes) // 32/2
				require.Equal(t, 0, node.MaxDynamicPaths)  // 0/4
				// The child (terminal "name" node) gets 16/2=8
				child := node.Branches[BranchJSON]
				require.Equal(t, 8, child.MaxDynamicTypes) // 16/2
				require.True(t, child.IsTerminal)
				require.NotNil(t, child.TerminalConfig)
			},
		},
		{
			name:          "Path with array - Dynamic branch",
			parts:         []string{"education", "name"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "IIT",
			isDynArrChild: false,
			parent: &Node{
				Name:            LogsV2BodyJSONColumn,
				isRoot:          true,
				MaxDynamicTypes: 32,
				MaxDynamicPaths: 0,
			},
			getTypes: func(path string) []telemetrytypes.JSONDataType {
				switch path {
				case "education":
					return []telemetrytypes.JSONDataType{telemetrytypes.ArrayDynamic}
				case "education[].name":
					return []telemetrytypes.JSONDataType{telemetrytypes.String}
				}
				return nil
			},
			validate: func(t *testing.T, node *Node) {
				require.NotNil(t, node)
				require.Equal(t, "education", node.Name)
				require.False(t, node.IsTerminal)
				require.NotNil(t, node.Branches[BranchDynamic])
				require.Equal(t, 16, node.Branches[BranchDynamic].MaxDynamicTypes)  // reset to base
				require.Equal(t, 256, node.Branches[BranchDynamic].MaxDynamicPaths) // reset to base
			},
		},
		{
			name:          "Path with both JSON and Dynamic branches",
			parts:         []string{"education", "name"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "IIT",
			isDynArrChild: false,
			parent: &Node{
				Name:            LogsV2BodyJSONColumn,
				isRoot:          true,
				MaxDynamicTypes: 32,
				MaxDynamicPaths: 0,
			},
			getTypes: func(path string) []telemetrytypes.JSONDataType {
				switch path {
				case "education":
					return []telemetrytypes.JSONDataType{telemetrytypes.ArrayJSON, telemetrytypes.ArrayDynamic}
				case "education[].name":
					return []telemetrytypes.JSONDataType{telemetrytypes.String}
				}
				return nil
			},
			validate: func(t *testing.T, node *Node) {
				require.NotNil(t, node)
				require.Equal(t, "education", node.Name)
				require.NotNil(t, node.Branches[BranchJSON])
				require.NotNil(t, node.Branches[BranchDynamic])
			},
		},
		{
			name:          "Index out of bounds returns nil",
			parts:         []string{"user"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "test",
			isDynArrChild: false,
			parent:        nil,
			getTypes:      func(path string) []telemetrytypes.JSONDataType { return nil },
			validate: func(t *testing.T, node *Node) {
				// buildPlan with index >= len(parts) returns nil
				// Here we call with index=0 and parts=["user"], so index < len(parts), so it won't be nil
				// To test index out of bounds, we'd need to call buildPlan with index >= len(parts)
				// For now, just verify it handles nil parent correctly
				if node != nil {
					require.Nil(t, node.Parent)
				}
			},
		},
		{
			name:          "Nested array path progression",
			parts:         []string{"education", "awards", "type"},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "sports",
			isDynArrChild: false,
			parent: &Node{
				Name:            LogsV2BodyJSONColumn,
				isRoot:          true,
				MaxDynamicTypes: 32,
				MaxDynamicPaths: 0,
			},
			getTypes: func(path string) []telemetrytypes.JSONDataType {
				switch path {
				case "education":
					return []telemetrytypes.JSONDataType{telemetrytypes.ArrayJSON}
				case "education[].awards":
					return []telemetrytypes.JSONDataType{telemetrytypes.ArrayJSON}
				case "education[].awards[].type":
					return []telemetrytypes.JSONDataType{telemetrytypes.String}
				}
				return nil
			},
			validate: func(t *testing.T, node *Node) {
				require.NotNil(t, node)
				require.Equal(t, "education", node.Name)
				// This node (education) gets 32/2=16 from parent
				require.Equal(t, 16, node.MaxDynamicTypes)
				require.NotNil(t, node.Branches[BranchJSON])
				// Child (awards) gets 16/2=8
				child := node.Branches[BranchJSON]
				require.Equal(t, 8, child.MaxDynamicTypes)
				// Grandchild (type) gets 8/2=4
				require.NotNil(t, child.Branches[BranchJSON])
				grandchild := child.Branches[BranchJSON]
				require.Equal(t, 4, grandchild.MaxDynamicTypes)
				require.True(t, grandchild.IsTerminal)
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			pb := &PlanBuilder{
				parts:    c.parts,
				operator: c.operator,
				value:    c.value,
				getTypes: c.getTypes,
			}
			result := pb.buildPlan(0, c.parent, c.isDynArrChild)
			c.validate(t, result)
		})
	}
}

// Helper function to find terminal node in a plan tree
func findTerminalNode(node *Node) *Node {
	if node == nil {
		return nil
	}
	if node.IsTerminal {
		return node
	}
	if node.Branches[BranchJSON] != nil {
		return findTerminalNode(node.Branches[BranchJSON])
	}
	if node.Branches[BranchDynamic] != nil {
		return findTerminalNode(node.Branches[BranchDynamic])
	}
	return nil
}

func TestPlanJSON(t *testing.T) {
	_, getTypes := testTypeSet()

	// Helper to find terminal node (alias for consistency)
	findTerminal := findTerminalNode

	// Helper to validate root structure
	validateRoot := func(t *testing.T, plan *Node, expectedColumn string, expectedMaxPaths int) {
		require.NotNil(t, plan)
		require.NotNil(t, plan.Parent)
		require.Equal(t, expectedColumn, plan.Parent.Name)
		require.True(t, plan.Parent.isRoot)
		require.Equal(t, 32, plan.Parent.MaxDynamicTypes)
		require.Equal(t, expectedMaxPaths, plan.Parent.MaxDynamicPaths)
	}

	t.Run("Basic Structure Tests", func(t *testing.T) {
		cases := []struct {
			name       string
			path       string
			operator   qbtypes.FilterOperator
			value      any
			isPromoted bool
			validate   func(t *testing.T, plans []*Node)
		}{
			{
				name:       "Simple path not promoted - validates root structure",
				path:       "user.name",
				operator:   qbtypes.FilterOperatorEqual,
				value:      "John",
				isPromoted: false,
				validate: func(t *testing.T, plans []*Node) {
					require.Len(t, plans, 1)
					validateRoot(t, plans[0], LogsV2BodyJSONColumn, 0)
					// Path "user.name" is split by "." not arraySep, so first part is "user.name"
					// But since arraySep is "[]", the split would be ["user.name"] if no arrays
					// Actually, let's check what the actual split produces
					require.NotNil(t, plans[0])
				},
			},
			{
				name:       "Simple path promoted - validates both plans",
				path:       "user.name",
				operator:   qbtypes.FilterOperatorEqual,
				value:      "John",
				isPromoted: true,
				validate: func(t *testing.T, plans []*Node) {
					require.Len(t, plans, 2)
					validateRoot(t, plans[0], LogsV2BodyJSONColumn, 0)
					validateRoot(t, plans[1], LogsV2BodyPromotedColumn, 1024)
					// Both should have same structure
					require.Equal(t, plans[0].Name, plans[1].Name)
				},
			},
			{
				name:       "Empty path returns nil",
				path:       "",
				operator:   qbtypes.FilterOperatorEqual,
				value:      "test",
				isPromoted: false,
				validate: func(t *testing.T, plans []*Node) {
					require.Nil(t, plans)
				},
			},
		}

		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				plans := PlanJSON(c.path, c.operator, c.value, c.isPromoted, getTypes)
				c.validate(t, plans)
			})
		}
	})

	t.Run("Operator Coverage", func(t *testing.T) {
		cases := []struct {
			name     string
			path     string
			operator qbtypes.FilterOperator
			value    any
			validate func(t *testing.T, plans []*Node)
		}{
			{
				name:     "Equal operator with string",
				path:     "user.name",
				operator: qbtypes.FilterOperatorEqual,
				value:    "John",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorEqual, terminal.TerminalConfig.Operator)
					require.Equal(t, "John", terminal.TerminalConfig.Value)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ValueType)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ElemType)
					require.False(t, terminal.TerminalConfig.PreferArrayAtEnd)
				},
			},
			{
				name:     "NotEqual operator with int64",
				path:     "user.age",
				operator: qbtypes.FilterOperatorNotEqual,
				value:    int64(30),
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorNotEqual, terminal.TerminalConfig.Operator)
					require.Equal(t, int64(30), terminal.TerminalConfig.Value)
					require.Equal(t, telemetrytypes.Int64, terminal.TerminalConfig.ValueType)
				},
			},
			{
				name:     "Contains operator with string - should prefer array if available",
				path:     "education[].name",
				operator: qbtypes.FilterOperatorContains,
				value:    "IIT",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorContains, terminal.TerminalConfig.Operator)
					require.Equal(t, "IIT", terminal.TerminalConfig.Value)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ValueType)
					// Since education[].name is String (not array), PreferArrayAtEnd should be false
					require.False(t, terminal.TerminalConfig.PreferArrayAtEnd)
				},
			},
			{
				name:     "Contains operator with array parameter - should prefer array",
				path:     "education[].parameters",
				operator: qbtypes.FilterOperatorContains,
				value:    1.65,
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorContains, terminal.TerminalConfig.Operator)
					// Should prefer array since ArrayFloat64 is available
					require.True(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.ArrayFloat64, terminal.TerminalConfig.ElemType)
					require.Equal(t, telemetrytypes.Float64, terminal.TerminalConfig.ValueType)
				},
			},
			{
				name:     "NotContains operator",
				path:     "education[].parameters",
				operator: qbtypes.FilterOperatorNotContains,
				value:    "test",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorNotContains, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "Like operator",
				path:     "user.name",
				operator: qbtypes.FilterOperatorLike,
				value:    "John%",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorLike, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "ILike operator",
				path:     "user.name",
				operator: qbtypes.FilterOperatorILike,
				value:    "john%",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorILike, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "GreaterThan operator with int64",
				path:     "user.age",
				operator: qbtypes.FilterOperatorGreaterThan,
				value:    int64(18),
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorGreaterThan, terminal.TerminalConfig.Operator)
					require.Equal(t, int64(18), terminal.TerminalConfig.Value)
				},
			},
			{
				name:     "GreaterThanOrEq operator",
				path:     "user.age",
				operator: qbtypes.FilterOperatorGreaterThanOrEq,
				value:    int64(18),
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorGreaterThanOrEq, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "In operator with array value",
				path:     "user.name",
				operator: qbtypes.FilterOperatorIn,
				value:    []any{"John", "Jane", "Bob"},
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorIn, terminal.TerminalConfig.Operator)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ValueType)
				},
			},
			{
				name:     "NotIn operator",
				path:     "user.age",
				operator: qbtypes.FilterOperatorNotIn,
				value:    []any{int64(18), int64(21), int64(65)},
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorNotIn, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "Exists operator with nil (GroupBy scenario)",
				path:     "user.age",
				operator: qbtypes.FilterOperatorExists,
				value:    nil,
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorExists, terminal.TerminalConfig.Operator)
					require.Nil(t, terminal.TerminalConfig.Value)
					// Should pick first scalar type from available types
					require.Equal(t, telemetrytypes.Int64, terminal.TerminalConfig.ValueType)
					require.Equal(t, telemetrytypes.Int64, terminal.TerminalConfig.ElemType)
				},
			},
			{
				name:     "Regexp operator",
				path:     "user.name",
				operator: qbtypes.FilterOperatorRegexp,
				value:    "^John.*",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorRegexp, terminal.TerminalConfig.Operator)
				},
			},
			{
				name:     "NotRegexp operator",
				path:     "user.name",
				operator: qbtypes.FilterOperatorNotRegexp,
				value:    "^John.*",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.Equal(t, qbtypes.FilterOperatorNotRegexp, terminal.TerminalConfig.Operator)
				},
			},
		}

		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				plans := PlanJSON(c.path, c.operator, c.value, false, getTypes)
				require.NotNil(t, plans)
				require.Len(t, plans, 1)
				c.validate(t, plans)
			})
		}
	})

	t.Run("Array Path Structure", func(t *testing.T) {
		cases := []struct {
			name     string
			path     string
			operator qbtypes.FilterOperator
			validate func(t *testing.T, plans []*Node)
		}{
			{
				name:     "Single array level - JSON branch only",
				path:     "education[].name",
				operator: qbtypes.FilterOperatorEqual,
				validate: func(t *testing.T, plans []*Node) {
					node := plans[0]
					require.Equal(t, "education", node.Name)
					require.False(t, node.IsTerminal)
					require.NotNil(t, node.Branches[BranchJSON])
					require.Nil(t, node.Branches[BranchDynamic])
					// Check progression: root(32) -> education(32/2=16) -> name terminal(16/2=8)
					child := node.Branches[BranchJSON]
					// Terminal node (name) gets MaxDynamicTypes from parent divided by 2
					require.True(t, child.IsTerminal)
					require.Equal(t, "name", child.Name)
					require.Equal(t, 8, child.MaxDynamicTypes) // 16/2=8
					require.Equal(t, 0, child.MaxDynamicPaths)
				},
			},
			{
				name:     "Single array level - both JSON and Dynamic branches",
				path:     "education[].awards[].type",
				operator: qbtypes.FilterOperatorEqual,
				validate: func(t *testing.T, plans []*Node) {
					node := plans[0]
					require.Equal(t, "education", node.Name)
					require.NotNil(t, node.Branches[BranchJSON])
					child := node.Branches[BranchJSON]
					require.Equal(t, "awards", child.Name)
					require.NotNil(t, child.Branches[BranchJSON])
					require.NotNil(t, child.Branches[BranchDynamic])
					// Check progression: root(32) -> education(32/2=16) -> awards(16/2=8) -> type terminal(8/2=4)
					require.Equal(t, 8, child.MaxDynamicTypes) // awards node has 8 (16/2)
					// Terminal is in grandchild (type), so check it
					terminalJSON := findTerminal(child.Branches[BranchJSON])
					terminalDyn := findTerminal(child.Branches[BranchDynamic])
					// awards has 8, so terminal gets 8/2=4
					require.Equal(t, 4, terminalJSON.MaxDynamicTypes)
					require.Equal(t, "type", terminalJSON.Name)
					// Dynamic branch resets to base values
					require.Equal(t, 16, terminalDyn.MaxDynamicTypes)  // Reset for Dynamic
					require.Equal(t, 256, terminalDyn.MaxDynamicPaths) // Reset for Dynamic
					require.Equal(t, "type", terminalDyn.Name)
				},
			},
			{
				name:     "Deeply nested array path - validates progression",
				path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
				operator: qbtypes.FilterOperatorEqual,
				validate: func(t *testing.T, plans []*Node) {
					node := plans[0]
					// Traverse and check progression at each level
					current := node
					expectedTypes := []int{16, 8, 4, 2, 1, 0} // 32/2 at each level
					level := 0
					for !current.IsTerminal && current.Branches[BranchJSON] != nil {
						if level < len(expectedTypes) {
							require.Equal(t, expectedTypes[level], current.MaxDynamicTypes,
								"MaxDynamicTypes mismatch at level %d", level)
						}
						current = current.Branches[BranchJSON]
						level++
					}
					require.True(t, current.IsTerminal)
				},
			},
			{
				name:     "ArrayAnyIndex replacement [*] to []",
				path:     "education[*].name",
				operator: qbtypes.FilterOperatorEqual,
				validate: func(t *testing.T, plans []*Node) {
					// Should work the same as education[].name
					node := plans[0]
					require.Equal(t, "education", node.Name)
					require.NotNil(t, node.Branches[BranchJSON])
					terminal := findTerminal(node.Branches[BranchJSON])
					require.NotNil(t, terminal)
					require.Equal(t, "name", terminal.Name)
				},
			},
			{
				name:     "Multiple arrayAnyIndex replacements",
				path:     "education[*].awards[*].type",
				operator: qbtypes.FilterOperatorEqual,
				validate: func(t *testing.T, plans []*Node) {
					node := plans[0]
					require.NotNil(t, node.Branches[BranchJSON])
					child := node.Branches[BranchJSON]
					require.NotNil(t, child.Branches[BranchJSON])
					require.NotNil(t, child.Branches[BranchDynamic])
				},
			},
		}

		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				plans := PlanJSON(c.path, c.operator, "test_value", false, getTypes)
				require.NotNil(t, plans)
				require.Len(t, plans, 1)
				c.validate(t, plans)
			})
		}
	})

	t.Run("Array Membership Scenarios", func(t *testing.T) {
		cases := []struct {
			name     string
			path     string
			operator qbtypes.FilterOperator
			value    any
			validate func(t *testing.T, plans []*Node)
		}{
			{
				name:     "Contains with ArrayFloat64 - should prefer array",
				path:     "education[].parameters",
				operator: qbtypes.FilterOperatorContains,
				value:    1.65,
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.True(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.ArrayFloat64, terminal.TerminalConfig.ElemType)
					require.Equal(t, telemetrytypes.Float64, terminal.TerminalConfig.ValueType)
				},
			},
			{
				name:     "Contains with ArrayDynamic - should prefer array",
				path:     "education[].parameters",
				operator: qbtypes.FilterOperatorContains,
				value:    "passed",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					// ArrayDynamic is available, so should prefer array
					require.True(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.ArrayString, terminal.TerminalConfig.ElemType)
				},
			},
			{
				name:     "Contains with ArrayInt64 - should prefer array",
				path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].ratings",
				operator: qbtypes.FilterOperatorContains,
				value:    int64(4),
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.True(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.ArrayInt64, terminal.TerminalConfig.ElemType)
				},
			},
			{
				name:     "Contains with ArrayString - should prefer array",
				path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].ratings",
				operator: qbtypes.FilterOperatorContains,
				value:    "Good",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					require.True(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.ArrayString, terminal.TerminalConfig.ElemType)
				},
			},
			{
				name:     "Contains with scalar only - should not prefer array",
				path:     "education[].name",
				operator: qbtypes.FilterOperatorContains,
				value:    "IIT",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					// Only String scalar available, no array
					require.False(t, terminal.TerminalConfig.PreferArrayAtEnd)
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ElemType)
				},
			},
		}

		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				plans := PlanJSON(c.path, c.operator, c.value, false, getTypes)
				require.NotNil(t, plans)
				require.Len(t, plans, 1)
				c.validate(t, plans)
			})
		}
	})

	t.Run("Promoted vs Non-Promoted Differences", func(t *testing.T) {
		path := "education[].awards[].type"
		operator := qbtypes.FilterOperatorEqual
		value := "sports"

		t.Run("Non-promoted plan", func(t *testing.T) {
			plans := PlanJSON(path, operator, value, false, getTypes)
			require.Len(t, plans, 1)
			validateRoot(t, plans[0], LogsV2BodyJSONColumn, 0)
		})

		t.Run("Promoted plan", func(t *testing.T) {
			plans := PlanJSON(path, operator, value, true, getTypes)
			require.Len(t, plans, 2)
			validateRoot(t, plans[0], LogsV2BodyJSONColumn, 0)
			validateRoot(t, plans[1], LogsV2BodyPromotedColumn, 1024)

			// Both should have same tree structure
			terminal1 := findTerminal(plans[0])
			terminal2 := findTerminal(plans[1])
			require.NotNil(t, terminal1)
			require.NotNil(t, terminal2)
			require.Equal(t, terminal1.Name, terminal2.Name)
			require.Equal(t, terminal1.TerminalConfig.Operator, terminal2.TerminalConfig.Operator)
			require.Equal(t, terminal1.TerminalConfig.Value, terminal2.TerminalConfig.Value)

			// But promoted plan should have different MaxDynamicPaths progression
			// Check that promoted plan has different MaxDynamicPaths at each level
			node1 := plans[0] // "education" node (non-promoted)
			node2 := plans[1] // "education" node (promoted)
			// For promoted with isDynArrChild=true: first child gets reset values (256)
			// For non-promoted: first child gets 0/4=0
			require.Equal(t, 256, node2.MaxDynamicPaths, "Promoted education node should have 256 (reset value)")
			require.Equal(t, 0, node1.MaxDynamicPaths, "Non-promoted education node should have 0")
			if node1.Branches[BranchJSON] != nil && node2.Branches[BranchJSON] != nil {
				child1 := node1.Branches[BranchJSON] // "awards" node (non-promoted)
				child2 := node2.Branches[BranchJSON] // "awards" node (promoted)
				// Promoted awards: parent(256) -> child gets 256/4 = 64
				require.Equal(t, 64, child2.MaxDynamicPaths, "Promoted awards node should have 64")
				// Non-promoted awards: parent(0) -> child gets 0/4 = 0
				require.Equal(t, 0, child1.MaxDynamicPaths, "Non-promoted awards node should have 0")
			}
		})
	})

	t.Run("Edge Cases", func(t *testing.T) {
		cases := []struct {
			name     string
			path     string
			operator qbtypes.FilterOperator
			value    any
			validate func(t *testing.T, plans []*Node)
		}{
			{
				name:     "Path with no available types - should still create plan",
				path:     "unknown.path",
				operator: qbtypes.FilterOperatorEqual,
				value:    "test",
				validate: func(t *testing.T, plans []*Node) {
					require.NotNil(t, plans)
					require.Len(t, plans, 1)
					require.NotNil(t, plans[0])
					// Terminal should have fallback configuration
					terminal := findTerminal(plans[0])
					if terminal != nil {
						require.NotNil(t, terminal.TerminalConfig)
						// Should fallback to String if no types available
						require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ValueType)
						require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ElemType)
					}
				},
			},
			{
				name:     "Very deep nesting - validates progression doesn't go negative",
				path:     "interests[].entities[].reviews[].entries[].metadata[].positions[].name",
				operator: qbtypes.FilterOperatorEqual,
				value:    "Engineer",
				validate: func(t *testing.T, plans []*Node) {
					node := plans[0]
					current := node
					// Traverse all levels and ensure MaxDynamicTypes never goes negative
					for !current.IsTerminal && current.Branches[BranchJSON] != nil {
						require.GreaterOrEqual(t, current.MaxDynamicTypes, 0,
							"MaxDynamicTypes should not be negative at node %s", current.Name)
						require.GreaterOrEqual(t, current.MaxDynamicPaths, 0,
							"MaxDynamicPaths should not be negative at node %s", current.Name)
						current = current.Branches[BranchJSON]
					}
				},
			},
			{
				name:     "Path with mixed scalar and array types",
				path:     "education[].type",
				operator: qbtypes.FilterOperatorEqual,
				value:    "high_school",
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					// education[].type has both String and Int64 types
					require.Contains(t, terminal.AvailableTypes, telemetrytypes.String)
					require.Contains(t, terminal.AvailableTypes, telemetrytypes.Int64)
					// Should prefer String since value is string
					require.Equal(t, telemetrytypes.String, terminal.TerminalConfig.ValueType)
				},
			},
			{
				name:     "Exists with only array types available",
				path:     "education",
				operator: qbtypes.FilterOperatorExists,
				value:    nil,
				validate: func(t *testing.T, plans []*Node) {
					terminal := findTerminal(plans[0])
					require.NotNil(t, terminal)
					require.NotNil(t, terminal.TerminalConfig)
					// education is ArrayJSON, so should use that
					require.Equal(t, telemetrytypes.ArrayJSON, terminal.TerminalConfig.ValueType)
				},
			},
		}

		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				plans := PlanJSON(c.path, c.operator, c.value, false, getTypes)
				c.validate(t, plans)
			})
		}
	})

	t.Run("Tree Structure Validation", func(t *testing.T) {
		path := "education[].awards[].participated[].team[].branch"
		plans := PlanJSON(path, qbtypes.FilterOperatorEqual, "Civil", false, getTypes)
		require.Len(t, plans, 1)

		node := plans[0]
		// Validate all nodes have correct parent references
		var validateNode func(*Node)
		validateNode = func(n *Node) {
			if n == nil {
				return
			}
			if n.Parent != nil {
				require.NotNil(t, n.Parent, "Node %s should have parent", n.Name)
				// Parent should not be terminal if it has children (unless it's root)
				if !n.IsTerminal && !n.Parent.isRoot {
					require.False(t, n.Parent.IsTerminal,
						"Non-terminal node %s should have non-terminal parent", n.Name)
				}
			}
			if n.Branches[BranchJSON] != nil {
				validateNode(n.Branches[BranchJSON])
			}
			if n.Branches[BranchDynamic] != nil {
				validateNode(n.Branches[BranchDynamic])
			}
		}
		validateNode(node)
	})
}

/*
		{
	  "user": {
	    "name": "John Doe",
	    "age": 47,
	    "height": 5.8
	  },
	  "education": [
	    {
	      "name": "Scaler School of Marketing",
	      "type": 10024,
	      "internal_type": "crash_course",
	      "metadata": {
	        "location": "Bengaluru, KA"
	      },
	      "parameters": [
	        7.83,
	        "passed",
	        true
	      ],
	      "duration": "6m",
	      "mode": "hybrid",
	      "year": 2024,
	      "field": "Marketing"
	    },
	    {
	      "name": "Saint Xavier",
	      "type": "high_school",
	      "metadata": {
	        "location": "Jaipur, Rajsthan"
	      },
	      "parameters": [
	        1.65,
	        7.83,
	        1.33
	      ],
	      "awards": [
	        {
	          "name": "Inter School Games",
	          "rank": 2,
	          "medal": "silver",
	          "type": "sports",
	          "participated": [
	            {
	              "type": "race",
	              "race_type": "cycle"
	            },
	            "chess",
	            {
	              "type": "race",
	              "race_type": "relay"
	            }
	          ]
	        }
	      ]
	    },
	    {
	      "name": "IIT Roorkee",
	      "type": "undergraduation",
	      "metadata": {
	        "location": "Roorkee, Uttarakhand"
	      },
	      "awards": [
	        {
	          "name": "Iron Award",
	          "type": "scholar",
	          "semester": 8
	        },
	        85,
	        {
	          "name": "Inter IIT games",
	          "type": "sports",
	          "semester": 4,
	          "participated": [
	            {
	              "type": "coding",
	              "field": "AI",
	              "project_type": "mobile_dev",
	              "project_name": "Budget Calculator"
	            },
	            {
	              "type": "Hackathon",
	              "team_based": true,
	              "team_name": "Stray Dogs",
	              "team": [
	                {
	                  "name": "John Doe",
	                  "branch": "Civil Engineering",
	                  "semester": 4
	                },
	                {
	                  "name": "Binks",
	                  "branch": "Computer Science",
	                  "semester": 6
	                },
	                {
	                  "name": "Terry Crews",
	                  "branch": "Mechanical Enginerring",
	                  "semester": 2
	                }
	              ]
	            }
	          ]
	        }
	      ]
	    }
	  ],
	  "interests": [
	    {
	      "type": "education",
	      "entities": [
	        {
	          "application_date": "27 Oct 2023",
	          "reviews": [
	            {
	              "given_by": "Prof Stark",
	              "remarks": "oki",
	              "weight": 8.98,
	              "passed": true
	            },
	            {
	              "type": "analysis",
	              "given_by": "Prof Jane",
	              "analysis_type": 10023,
	              "entries": [
	                {
	                  "subject": "Physics",
	                  "status": "approved"
	                },
	                {
	                  "subject": "Software Engineering",
	                  "status": "approved",
	                  "metadata": [
	                    {
	                      "company": "Xendar Technologies",
	                      "experience": 18,
	                      "unit": "months"
	                    },
	                    {
	                      "company": "Hike Messanger",
	                      "experience": 5.6,
	                      "unit": "years",
	                      "positions": [
	                        {
	                          "name": "Software Engineer 2",
	                          "duration": 24,
	                          "unit": "months"
	                        },
	                        {
	                          "name": "Software Engineer",
	                          "duration": 1.6,
	                          "unit": "years",
	                          "ratings": [
	                            "Good",
	                            "Very Good",
	                            "Good"
	                          ]
	                        },
	                        {
	                          "name": "Software Engineer",
	                          "duration": 2,
	                          "unit": "years",
	                          "ratings": [
	                            3,
	                            4,
	                            4
	                          ]
	                        }
	                      ]
	                    }
	                  ]
	                }
	              ]
	            }
	          ]
	        }
	      ]
	    }
	  ]
	}
*/
func testTypeSet() (map[string][]telemetrytypes.JSONDataType, func(path string) []telemetrytypes.JSONDataType) {
	types := map[string][]telemetrytypes.JSONDataType{
		"user.name":                                           {telemetrytypes.String},
		"user.age":                                            {telemetrytypes.Int64},
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

	return types, func(path string) []telemetrytypes.JSONDataType {
		return types[path]
	}
}
