package querybuilder

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// SharedCondition is the Compile of every storage without its own condition
// language: the field's read, the shared data-type collision cast, the
// operator, then the guard rule. A sentinel-reading field takes the exists
// guard on the operators that would otherwise match the sentinel.
func SharedCondition(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	field *telemetrytypes.LogicalField,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (qbtypes.Compiled, error) {
	condition, err := sharedOperator(ctx, q, storage, field, operator, value, sb)
	if err != nil || condition == "" {
		return qbtypes.Compiled{}, err
	}
	if !operator.AddDefaultExistsFilter() {
		return qbtypes.Compiled{Condition: condition}, nil
	}
	existence, err := LogicalExistsExpr(ctx, q, storage, field, true)
	if err != nil {
		return qbtypes.Compiled{}, err
	}
	if existence.WhenAbsent != qbtypes.AbsentIsSentinel {
		return qbtypes.Compiled{Condition: condition}, nil
	}
	return qbtypes.Compiled{Condition: sb.And(condition, sqlbuilder.Escape(existence.Predicate))}, nil
}

// sharedOperator expands a list per item, so each item takes its own cast,
// and casts the read against the operand for everything else.
func sharedOperator(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	field *telemetrytypes.LogicalField,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorIn, qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		itemOperator := qbtypes.FilterOperatorEqual
		if operator == qbtypes.FilterOperatorNotIn {
			itemOperator = qbtypes.FilterOperatorNotEqual
		}
		conditions := make([]string, 0, len(values))
		for _, item := range values {
			condition, err := sharedOperator(ctx, q, storage, field, itemOperator, item, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, condition)
		}
		// `=`+OR and `!=`+AND instead of IN and NOT IN, to make use of the index
		if operator == qbtypes.FilterOperatorIn {
			return sb.Or(conditions...), nil
		}
		return sb.And(conditions...), nil
	}

	if operator.IsStringSearchOperator() {
		value = FormatValueForContains(value)
	}
	read, err := LogicalValueExpr(ctx, q, storage, field)
	if err != nil {
		return "", err
	}
	// Coercion switches only on the data type, which every member shares, so
	// the first member stands in for the field.
	read, value = DataTypeCollisionHandledFieldName(field.Single(), value, read, operator)
	return OperatorCondition(ctx, q, storage, field, read, operator, value, sb)
}

// OperatorCondition renders one operator over an already cast read. It is
// the shared switch a storage with its own cast policy composes with. A list
// operator is the caller's to expand, so each item takes its own cast.
func OperatorCondition(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	field *telemetrytypes.LogicalField,
	read string,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(read, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(read, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(read, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(read, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(read, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(read, value), nil

	case qbtypes.FilterOperatorLike:
		return sb.Like(read, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(read, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(read, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(read, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(read, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(read, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(read), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(read), sb.Var(value)), nil

	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(read, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok || len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(read, values[0], values[1]), nil

	// exists and not exists are key membership checks, so the storage's
	// presence test answers them
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		existence, err := LogicalExistsExpr(ctx, q, storage, field, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(existence.Predicate), nil
	}
	return "", qbtypes.ErrUnsupportedOperator
}
