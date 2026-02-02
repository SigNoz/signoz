package contextlinks

import (
	"fmt"
	"slices"
	"strings"

	parser "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/antlr4-go/antlr/v4"
	"golang.org/x/exp/maps"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type WhereClauseRewriter struct {
	parser.BaseFilterQueryVisitor
	labels       map[string]string
	groupByItems []qbtypes.GroupByKey
	groupBySet   map[string]struct{}
	keysSeen     map[string]struct{}
	rewritten    strings.Builder
}

// PrepareFilterExpression prepares the where clause for the query
// `labels` contains the key value pairs of the labels from the result of the query
// We "visit" the where clause and make necessary changes to existing query
// There are two cases:
// 1. The label is present in the where clause
// 2. The label is not present in the where clause
//
// Example for case 2:
// Latency by service.name without any filter
// In this case, for each service with latency > threshold we send a notification
// The expectation is that clicking on the related traces for service A, will
// take us to the traces page with the filter service.name=A
// So for all the missing labels in the where clause, we add them as key = value
//
// Example for case 1:
// Severity text IN (WARN, ERROR)
// In this case, the Severity text will appear in the `labels` if it were part of the group
// by clause, in which case we replace it with the actual value for the notification
// i.e Severity text = WARN
// If the Severity text is not part of the group by clause, then we add it as it is
func PrepareFilterExpression(labels map[string]string, whereClause string, groupByItems []qbtypes.GroupByKey) string {
	if whereClause == "" && len(labels) == 0 {
		return ""
	}

	//delete predefined alert labels
	for _, label := range PredefinedAlertLabels {
		delete(labels, label)
	}

	groupBySet := make(map[string]struct{})
	for _, item := range groupByItems {
		groupBySet[item.Name] = struct{}{}
	}

	input := antlr.NewInputStream(whereClause)
	lexer := parser.NewFilterQueryLexer(input)
	stream := antlr.NewCommonTokenStream(lexer, 0)
	parser := parser.NewFilterQueryParser(stream)

	tree := parser.Query()

	rewriter := &WhereClauseRewriter{
		labels:       labels,
		groupByItems: groupByItems,
		groupBySet:   groupBySet,
		keysSeen:     map[string]struct{}{},
	}

	// visit the tree to rewrite the where clause
	rewriter.Visit(tree)
	rewrittenClause := strings.TrimSpace(rewriter.rewritten.String())

	// sorted key for deterministic order
	sortedKeys := maps.Keys(labels)
	slices.Sort(sortedKeys)

	// case 2: add missing labels from the labels map
	missingLabels := []string{}
	for _, key := range sortedKeys {
		if !rewriter.isKeyInWhereClause(key) {
			// escape the value if it contains special characters or spaces
			escapedValue := escapeValueIfNeeded(labels[key])
			missingLabels = append(missingLabels, fmt.Sprintf("%s=%s", key, escapedValue))
		}
	}

	// combine
	if len(missingLabels) > 0 {
		if rewrittenClause != "" {
			rewrittenClause = fmt.Sprintf("(%s) AND %s", rewrittenClause, strings.Join(missingLabels, " AND "))
		} else {
			rewrittenClause = strings.Join(missingLabels, " AND ")
		}
	}

	return rewrittenClause
}

// Visit implements the visitor for the query rule
func (r *WhereClauseRewriter) Visit(tree antlr.ParseTree) interface{} {
	return tree.Accept(r)
}

// VisitQuery visits the query node
func (r *WhereClauseRewriter) VisitQuery(ctx *parser.QueryContext) interface{} {
	if ctx.Expression() != nil {
		ctx.Expression().Accept(r)
	}
	return nil
}

// VisitExpression visits the expression node
func (r *WhereClauseRewriter) VisitExpression(ctx *parser.ExpressionContext) interface{} {
	if ctx.OrExpression() != nil {
		ctx.OrExpression().Accept(r)
	}
	return nil
}

// VisitOrExpression visits OR expressions
func (r *WhereClauseRewriter) VisitOrExpression(ctx *parser.OrExpressionContext) interface{} {
	for i, andExpr := range ctx.AllAndExpression() {
		if i > 0 {
			r.rewritten.WriteString(" OR ")
		}
		andExpr.Accept(r)
	}
	return nil
}

// VisitAndExpression visits AND expressions
func (r *WhereClauseRewriter) VisitAndExpression(ctx *parser.AndExpressionContext) interface{} {
	unaryExprs := ctx.AllUnaryExpression()
	for i, unaryExpr := range unaryExprs {
		if i > 0 {
			// Check if there's an explicit AND
			if i-1 < len(ctx.AllAND()) && ctx.AND(i-1) != nil {
				r.rewritten.WriteString(" AND ")
			} else {
				// implicit
				r.rewritten.WriteString(" AND ")
			}
		}
		unaryExpr.Accept(r)
	}
	return nil
}

// VisitUnaryExpression visits unary expressions (with optional NOT)
func (r *WhereClauseRewriter) VisitUnaryExpression(ctx *parser.UnaryExpressionContext) interface{} {
	if ctx.NOT() != nil {
		r.rewritten.WriteString("NOT ")
	}
	if ctx.Primary() != nil {
		ctx.Primary().Accept(r)
	}
	return nil
}

// VisitPrimary visits primary expressions
func (r *WhereClauseRewriter) VisitPrimary(ctx *parser.PrimaryContext) interface{} {
	if ctx.LPAREN() != nil && ctx.RPAREN() != nil {
		r.rewritten.WriteString("(")
		if ctx.OrExpression() != nil {
			ctx.OrExpression().Accept(r)
		}
		r.rewritten.WriteString(")")
	} else if ctx.Comparison() != nil {
		ctx.Comparison().Accept(r)
	} else if ctx.FunctionCall() != nil {
		ctx.FunctionCall().Accept(r)
	} else if ctx.FullText() != nil {
		ctx.FullText().Accept(r)
	} else if ctx.Key() != nil {
		ctx.Key().Accept(r)
	} else if ctx.Value() != nil {
		ctx.Value().Accept(r)
	}
	return nil
}

// VisitComparison visits comparison expressions
func (r *WhereClauseRewriter) VisitComparison(ctx *parser.ComparisonContext) interface{} {
	if ctx.Key() == nil {
		return nil
	}

	key := ctx.Key().GetText()
	r.keysSeen[key] = struct{}{}

	// Check if this key is in the labels and was part of group by
	if value, exists := r.labels[key]; exists {
		if _, partOfGroup := r.groupBySet[key]; partOfGroup {
			// Case 1: Replace with actual value
			escapedValue := escapeValueIfNeeded(value)
			r.rewritten.WriteString(fmt.Sprintf("%s=%s", key, escapedValue))
			return nil
		}
	}

	// Otherwise, keep the original comparison
	r.rewritten.WriteString(key)

	if ctx.EQUALS() != nil {
		r.rewritten.WriteString("=")
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil {
		if ctx.NOT_EQUALS() != nil {
			r.rewritten.WriteString("!=")
		} else {
			r.rewritten.WriteString("<>")
		}
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.LT() != nil {
		r.rewritten.WriteString("<")
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.LE() != nil {
		r.rewritten.WriteString("<=")
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.GT() != nil {
		r.rewritten.WriteString(">")
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.GE() != nil {
		r.rewritten.WriteString(">=")
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.LIKE() != nil || ctx.ILIKE() != nil {
		if ctx.LIKE() != nil {
			if ctx.NOT() != nil {
				r.rewritten.WriteString(" NOT LIKE ")
			} else {
				r.rewritten.WriteString(" LIKE ")
			}

		} else {
			if ctx.NOT() != nil {
				r.rewritten.WriteString(" NOT ILIKE ")
			} else {
				r.rewritten.WriteString(" ILIKE ")
			}

		}
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.BETWEEN() != nil {
		if ctx.NOT() != nil {
			r.rewritten.WriteString(" NOT BETWEEN ")
		} else {
			r.rewritten.WriteString(" BETWEEN ")
		}
		if len(ctx.AllValue()) >= 2 {
			r.rewritten.WriteString(ctx.Value(0).GetText())
			r.rewritten.WriteString(" AND ")
			r.rewritten.WriteString(ctx.Value(1).GetText())
		}
	} else if ctx.InClause() != nil {
		r.rewritten.WriteString(" ")
		ctx.InClause().Accept(r)
	} else if ctx.NotInClause() != nil {
		r.rewritten.WriteString(" ")
		ctx.NotInClause().Accept(r)
	} else if ctx.EXISTS() != nil {
		if ctx.NOT() != nil {
			r.rewritten.WriteString(" NOT EXISTS")
		} else {
			r.rewritten.WriteString(" EXISTS")
		}
	} else if ctx.REGEXP() != nil {
		if ctx.NOT() != nil {
			r.rewritten.WriteString(" NOT REGEXP ")
		} else {
			r.rewritten.WriteString(" REGEXP ")
		}
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	} else if ctx.CONTAINS() != nil {
		if ctx.NOT() != nil {
			r.rewritten.WriteString(" NOT CONTAINS ")
		} else {
			r.rewritten.WriteString(" CONTAINS ")
		}
		if ctx.Value(0) != nil {
			r.rewritten.WriteString(ctx.Value(0).GetText())
		}
	}

	return nil
}

// VisitInClause visits IN clauses
func (r *WhereClauseRewriter) VisitInClause(ctx *parser.InClauseContext) interface{} {
	r.rewritten.WriteString("IN ")
	if ctx.LPAREN() != nil {
		r.rewritten.WriteString("(")
		if ctx.ValueList() != nil {
			ctx.ValueList().Accept(r)
		}
		r.rewritten.WriteString(")")
	} else if ctx.LBRACK() != nil {
		r.rewritten.WriteString("[")
		if ctx.ValueList() != nil {
			ctx.ValueList().Accept(r)
		}
		r.rewritten.WriteString("]")
	} else if ctx.Value() != nil {
		r.rewritten.WriteString(ctx.Value().GetText())
	}
	return nil
}

// VisitNotInClause visits NOT IN clauses
func (r *WhereClauseRewriter) VisitNotInClause(ctx *parser.NotInClauseContext) interface{} {
	r.rewritten.WriteString("NOT IN ")
	if ctx.LPAREN() != nil {
		r.rewritten.WriteString("(")
		if ctx.ValueList() != nil {
			ctx.ValueList().Accept(r)
		}
		r.rewritten.WriteString(")")
	} else if ctx.LBRACK() != nil {
		r.rewritten.WriteString("[")
		if ctx.ValueList() != nil {
			ctx.ValueList().Accept(r)
		}
		r.rewritten.WriteString("]")
	} else if ctx.Value() != nil {
		r.rewritten.WriteString(ctx.Value().GetText())
	}
	return nil
}

// VisitValueList visits value lists
func (r *WhereClauseRewriter) VisitValueList(ctx *parser.ValueListContext) interface{} {
	values := ctx.AllValue()
	for i, val := range values {
		if i > 0 {
			r.rewritten.WriteString(", ")
		}
		r.rewritten.WriteString(val.GetText())
	}
	return nil
}

// VisitFullText visits full text expressions
func (r *WhereClauseRewriter) VisitFullText(ctx *parser.FullTextContext) interface{} {
	r.rewritten.WriteString(ctx.GetText())
	return nil
}

// VisitFunctionCall visits function calls
func (r *WhereClauseRewriter) VisitFunctionCall(ctx *parser.FunctionCallContext) interface{} {
	// Write function name
	if ctx.HAS() != nil {
		r.rewritten.WriteString("has")
	} else if ctx.HASANY() != nil {
		r.rewritten.WriteString("hasany")
	} else if ctx.HASALL() != nil {
		r.rewritten.WriteString("hasall")
	} else if ctx.HASTOKEN() != nil {
		r.rewritten.WriteString("hasToken")
	}

	r.rewritten.WriteString("(")
	if ctx.FunctionParamList() != nil {
		ctx.FunctionParamList().Accept(r)
	}
	r.rewritten.WriteString(")")
	return nil
}

// VisitFunctionParamList visits function parameter lists
func (r *WhereClauseRewriter) VisitFunctionParamList(ctx *parser.FunctionParamListContext) interface{} {
	params := ctx.AllFunctionParam()
	for i, param := range params {
		if i > 0 {
			r.rewritten.WriteString(", ")
		}
		param.Accept(r)
	}
	return nil
}

// VisitFunctionParam visits function parameters
func (r *WhereClauseRewriter) VisitFunctionParam(ctx *parser.FunctionParamContext) interface{} {
	if ctx.Key() != nil {
		ctx.Key().Accept(r)
	} else if ctx.Value() != nil {
		ctx.Value().Accept(r)
	} else if ctx.Array() != nil {
		ctx.Array().Accept(r)
	}
	return nil
}

// VisitArray visits array expressions
func (r *WhereClauseRewriter) VisitArray(ctx *parser.ArrayContext) interface{} {
	r.rewritten.WriteString("[")
	if ctx.ValueList() != nil {
		ctx.ValueList().Accept(r)
	}
	r.rewritten.WriteString("]")
	return nil
}

// VisitValue visits value expressions
func (r *WhereClauseRewriter) VisitValue(ctx *parser.ValueContext) interface{} {
	r.rewritten.WriteString(ctx.GetText())
	return nil
}

// VisitKey visits key expressions
func (r *WhereClauseRewriter) VisitKey(ctx *parser.KeyContext) interface{} {
	r.keysSeen[ctx.GetText()] = struct{}{}
	r.rewritten.WriteString(ctx.GetText())
	return nil
}

func (r *WhereClauseRewriter) isKeyInWhereClause(key string) bool {
	_, ok := r.keysSeen[key]
	return ok
}

// escapeValueIfNeeded adds single quotes to string values and escapes single quotes within them
// Numeric and boolean values are returned as-is
func escapeValueIfNeeded(value string) string {
	// Check if it's a number
	if _, err := fmt.Sscanf(value, "%f", new(float64)); err == nil {
		return value
	}

	// Check if it's a boolean
	if strings.ToLower(value) == "true" || strings.ToLower(value) == "false" {
		return value
	}

	// For all other values (strings), escape single quotes and wrap in single quotes
	escaped := strings.ReplaceAll(value, "'", "\\'")
	return fmt.Sprintf("'%s'", escaped)
}
