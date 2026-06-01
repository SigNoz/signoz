package telemetrylogs

import (
	"fmt"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type JSONFieldMapper struct{}

func NewJSONFieldMapper() *JSONFieldMapper { return &JSONFieldMapper{} }

// FieldExprFor returns the ClickHouse expression that reads the field value
// from the given JSON column — a dynamicElement(...) scalar for primitives or
// an arrayFlatten(arrayConcat(...)) for array paths.
func (j *JSONFieldMapper) FieldExprFor(key *telemetrytypes.TelemetryFieldKey, column *schemamigrator.Column) (string, error) {
	node, err := key.PlanBuilder.Build(column)
	if err != nil {
		return "", err
	}
	if node.IsTerminal {
		return fmt.Sprintf("dynamicElement(%s, '%s')", node.FieldPath(), node.TerminalConfig.ElemType.StringValue()), nil
	}
	return j.buildArrayConcat(node)
}

// ExistExprFor returns a boolean ClickHouse expression that evaluates to true
// when the field is present in the given column. Used as the dispatch predicate
// inside multiIf when multiple columns are active for a time range.
func (j *JSONFieldMapper) ExistExprFor(key *telemetrytypes.TelemetryFieldKey, column *schemamigrator.Column) (string, error) {
	node, err := key.PlanBuilder.Build(column)
	if err != nil {
		return "", err
	}
	if node.IsTerminal {
		dynamicExpr := fmt.Sprintf("dynamicElement(%s, '%s')", node.FieldPath(), node.TerminalConfig.ElemType.StringValue())
		if node.TerminalConfig.ElemType.IsArray {
			return fmt.Sprintf("length(%s) > 0", dynamicExpr), nil
		}
		return fmt.Sprintf("%s IS NOT NULL", dynamicExpr), nil
	}
	arrayConcatExpr, err := j.buildArrayConcat(node)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("length(%s) > 0", arrayConcatExpr), nil
}

// buildArrayConcat produces an arrayFlatten(arrayConcat(...)) expression that
// collects every matching element across all JSON / Dynamic branches.
func (j *JSONFieldMapper) buildArrayConcat(node *telemetrytypes.JSONAccessNode) (string, error) {
	var arrayMapExprs []string
	for _, branchType := range node.BranchesInOrder() {
		expr, err := j.buildArrayMap(node, branchType)
		if err != nil {
			return "", err
		}
		arrayMapExprs = append(arrayMapExprs, expr)
	}
	if len(arrayMapExprs) == 0 {
		return "", errors.Newf(errors.TypeInternal, CodeArrayMapExpressionsEmpty, "array map expressions are empty while building arrayConcat")
	}
	return fmt.Sprintf("arrayFlatten(arrayConcat(%s))", strings.Join(arrayMapExprs, ", ")), nil
}

// buildArrayMap builds a single arrayMap expression for one branch (JSON or
// Dynamic) at the current node level, recursing into deeper levels as needed.
func (j *JSONFieldMapper) buildArrayMap(currentNode *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType) (string, error) {
	if currentNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeCurrentNodeNil, "current node is nil while building arrayMap")
	}
	childNode := currentNode.Branches[branchType]
	if childNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeChildNodeNil, "child node is nil while building arrayMap")
	}

	var arrayExpr string
	if branchType == telemetrytypes.BranchJSON {
		arrayExpr = fmt.Sprintf("dynamicElement(%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')",
			currentNode.FieldPath(), currentNode.MaxDynamicTypes, currentNode.MaxDynamicPaths)
	} else {
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", currentNode.FieldPath())
		arrayExpr = fmt.Sprintf("arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)
	}

	if childNode.IsTerminal {
		dynamicElementExpr := fmt.Sprintf("dynamicElement(%s, '%s')", childNode.FieldPath(), childNode.TerminalConfig.ElemType.StringValue())
		return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), dynamicElementExpr, arrayExpr), nil
	}

	var nestedExprs []string
	for _, bt := range childNode.BranchesInOrder() {
		expr, err := j.buildArrayMap(childNode, bt)
		if err != nil {
			return "", err
		}
		nestedExprs = append(nestedExprs, expr)
	}

	var nestedExpr string
	switch len(nestedExprs) {
	case 0:
		return "", errors.Newf(errors.TypeInternal, CodeNestedExpressionsEmpty, "nested expressions are empty while building arrayMap")
	case 1:
		nestedExpr = nestedExprs[0]
	default:
		nestedExpr = fmt.Sprintf("arrayConcat(%s)", strings.Join(nestedExprs, ", "))
	}

	return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), nestedExpr, arrayExpr), nil
}
