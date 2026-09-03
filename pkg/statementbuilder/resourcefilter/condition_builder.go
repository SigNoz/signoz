package resourcefilter

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type defaultConditionBuilder struct {
	fm qbtypes.FieldMapper
}

var _ qbtypes.ConditionBuilder = (*defaultConditionBuilder)(nil)

func NewConditionBuilder(fm qbtypes.FieldMapper) *defaultConditionBuilder {
	return &defaultConditionBuilder{fm: fm}
}

func valueForIndexFilter(op qbtypes.FilterOperator, key *telemetrytypes.TelemetryFieldKey, value any) any {
	switch v := value.(type) {
	case []any:
		// assuming array will always be for in and not in
		values := make([]string, 0, len(v))
		for _, v := range v {
			values = append(values, fmt.Sprintf(`%%%s":"%s%%`, key.Name, querybuilder.FormatValueForContains(v)))
		}
		return values
	default:
		// format to string for anything else as we store resource values as string
		if op == qbtypes.FilterOperatorEqual || op == qbtypes.FilterOperatorNotEqual {
			return fmt.Sprintf(`%%%s":"%s%%`, key.Name, querybuilder.FormatValueForContains(v))
		}
		return fmt.Sprintf(`%%%s%%%s%%`, key.Name, querybuilder.FormatValueForContains(v))
	}
}

func keyIndexFilter(key *telemetrytypes.TelemetryFieldKey) any {
	return fmt.Sprintf(`%%%s%%`, key.Name)
}

// The three helpers below take the members of one logical field. With a single
// member they render exactly the pre-family shapes; a family widens key/value
// index hints to any-member and presence to any-member (all-absent when negated).

func keyIndexCondition(sb *sqlbuilder.SelectBuilder, column string, members []*telemetrytypes.TelemetryFieldKey) string {
	conditions := make([]string, 0, len(members))
	for _, member := range members {
		conditions = append(conditions, sb.Like(column, keyIndexFilter(member)))
	}
	if len(conditions) == 1 {
		return conditions[0]
	}
	return sb.Or(conditions...)
}

func valueIndexCondition(
	sb *sqlbuilder.SelectBuilder,
	column string,
	members []*telemetrytypes.TelemetryFieldKey,
	op qbtypes.FilterOperator,
	value any,
	caseInsensitive bool,
) string {
	conditions := make([]string, 0, len(members))
	for _, member := range members {
		patterns := valueForIndexFilter(op, member, value)
		switch values := patterns.(type) {
		case []string:
			for _, pattern := range values {
				conditions = append(conditions, sb.Like(column, pattern))
			}
		default:
			if caseInsensitive {
				conditions = append(conditions, sb.ILike(column, values))
			} else {
				conditions = append(conditions, sb.Like(column, values))
			}
		}
	}
	if len(conditions) == 1 {
		return conditions[0]
	}
	return sb.Or(conditions...)
}

func memberPresenceCondition(sb *sqlbuilder.SelectBuilder, column string, members []*telemetrytypes.TelemetryFieldKey, exists bool) string {
	conditions := make([]string, 0, len(members))
	for _, member := range members {
		field := fmt.Sprintf("simpleJSONHas(%s, '%s')", column, member.Name)
		if exists {
			conditions = append(conditions, sb.E(field, true))
		} else {
			conditions = append(conditions, sb.NE(field, true))
		}
	}
	if exists {
		if len(conditions) == 1 {
			return conditions[0]
		}
		return sb.Or(conditions...)
	}
	return sb.And(conditions...)
}

// ConditionFor skips the logs-body function operators (they never apply to
// the resource fingerprint table; the main query still evaluates them) and
// hands the term to the generic flow. SkipResourceFilter the option is not
// applicable here: this builder IS the resource sub-query.
func (b *defaultConditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	logicalFields []*telemetrytypes.LogicalField,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	options qbtypes.ConditionBuilderOptions,
	op qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	if op.IsFunctionOperator() {
		return nil, nil, nil
	}
	scope := querybuilder.CompileScope{OrgID: orgID, StartNs: startNs, EndNs: endNs}
	return querybuilder.CompileTerm(ctx, scope, b, querybuilder.SkipResourceOnly, key, logicalFields, fieldKeys, options, op, value, sb)
}

// AmendEvidence: the fingerprint table folds no intrinsic storage into the evidence.
func (b *defaultConditionBuilder) AmendEvidence(_ context.Context, _ querybuilder.CompileScope, _ *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField {
	return fields
}

// Synthesize: an unknown key contributes no condition — the caller skips this
// filter entirely, and the main query still evaluates the term.
func (b *defaultConditionBuilder) Synthesize(_ context.Context, _ querybuilder.CompileScope, _ *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error) {
	return nil, nil, nil
}

// CompileField: the fingerprint operator forms with their bloom-index hints,
// for families and singles alike.
func (b *defaultConditionBuilder) CompileField(ctx context.Context, scope querybuilder.CompileScope, logical *telemetrytypes.LogicalField, op qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, []string, error) {
	cond, err := b.conditionForLogicalField(ctx, scope.OrgID, scope.StartNs, scope.EndNs, logical, op, value, sb)
	return cond, nil, err
}

func (b *defaultConditionBuilder) conditionForLogicalField(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	logical *telemetrytypes.LogicalField,
	op qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	// except for in, not in, between, not between all other operators should have formatted value
	// as we store resource values as string
	formattedValue := querybuilder.FormatValueForContains(value)

	// Every resource-context key maps to the labels column, so any member
	// resolves the column for the whole field.
	columns, err := b.fm.ColumnFor(ctx, orgID, startNs, endNs, logical.Single())
	if err != nil {
		return "", err
	}

	if len(columns) != 1 {
		return "", errors.Newf(errors.TypeInternal, errors.CodeInternal, "expected exactly 1 column, got %d", len(columns))
	}

	// resource evolution on main table doesn't affect this
	// as we have not changed the resource column in the resource fingerprint table.
	column := columns[0]

	members := logical.Members
	isFamily := logical.IsFamily()
	keyIdxFilter := keyIndexCondition(sb, column.Name, members)
	singleValueIndexFilter := valueForIndexFilter(op, members[0], value)

	fieldName, err := querybuilder.LogicalValueExpr(ctx, orgID, startNs, endNs, b.fm, logical)
	if err != nil {
		return "", err
	}

	switch op {
	case qbtypes.FilterOperatorEqual:
		return sb.And(
			sb.E(fieldName, formattedValue),
			keyIdxFilter,
			valueIndexCondition(sb, column.Name, members, op, value, false),
		), nil
	case qbtypes.FilterOperatorNotEqual:
		if isFamily {
			// A negated value-index hint would drop rows where another member
			// holds the value; the fingerprint scan is small enough without it.
			return sb.NE(fieldName, formattedValue), nil
		}
		return sb.And(
			sb.NE(fieldName, formattedValue),
			sb.NotLike(column.Name, singleValueIndexFilter),
		), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.And(sb.GT(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.And(sb.GE(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.And(sb.LT(fieldName, formattedValue), keyIdxFilter), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.And(sb.LE(fieldName, formattedValue), keyIdxFilter), nil

	case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike:
		return sb.And(
			sb.ILike(fieldName, formattedValue),
			keyIdxFilter,
			valueIndexCondition(sb, column.Name, members, op, value, true),
		), nil
	case qbtypes.FilterOperatorNotLike, qbtypes.FilterOperatorNotILike:
		// no index filter: as cannot apply `not contains x%y` as y can be somewhere else
		return sb.And(
			sb.NotILike(fieldName, formattedValue),
		), nil

	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(keyIdxFilter, sb.Between(fieldName, querybuilder.FormatValueForContains(values[0]), querybuilder.FormatValueForContains(values[1]))), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.And(sb.NotBetween(fieldName, querybuilder.FormatValueForContains(values[0]), querybuilder.FormatValueForContains(values[1]))), nil

	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		inConditions := make([]string, 0, len(values))
		for _, v := range values {
			inConditions = append(inConditions, sb.E(fieldName, querybuilder.FormatValueForContains(v)))
		}
		mainCondition := sb.Or(inConditions...)
		mainCondition = sb.And(
			mainCondition,
			keyIdxFilter,
			valueIndexCondition(sb, column.Name, members, op, value, false),
		)

		return mainCondition, nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		notInConditions := make([]string, 0, len(values))
		for _, v := range values {
			notInConditions = append(notInConditions, sb.NE(fieldName, querybuilder.FormatValueForContains(v)))
		}
		mainCondition := sb.And(notInConditions...)
		if isFamily {
			// A negated value-index hint would drop rows where another member
			// holds the value; the fingerprint scan is small enough without it.
			return mainCondition, nil
		}
		valConditions := make([]string, 0, len(values))
		if valuesForIndexFilter, ok := singleValueIndexFilter.([]string); ok {
			for _, v := range valuesForIndexFilter {
				valConditions = append(valConditions, sb.NotLike(column.Name, v))
			}
		}
		mainCondition = sb.And(mainCondition, sb.And(valConditions...))
		return mainCondition, nil

	case qbtypes.FilterOperatorExists:
		return sb.And(
			memberPresenceCondition(sb, column.Name, members, true),
			keyIdxFilter,
		), nil
	case qbtypes.FilterOperatorNotExists:
		return memberPresenceCondition(sb, column.Name, members, false), nil

	case qbtypes.FilterOperatorRegexp:
		return sb.And(
			fmt.Sprintf("match(%s, %s)", fieldName, sb.Var(formattedValue)),
			keyIdxFilter,
		), nil
	case qbtypes.FilterOperatorNotRegexp:
		return sb.And(
			fmt.Sprintf("NOT match(%s, %s)", fieldName, sb.Var(formattedValue)),
		), nil

	case qbtypes.FilterOperatorContains:
		return sb.And(
			sb.ILike(fieldName, fmt.Sprintf(`%%%s%%`, formattedValue)),
			keyIdxFilter,
			valueIndexCondition(sb, column.Name, members, op, value, true),
		), nil
	case qbtypes.FilterOperatorNotContains:
		// no index filter: as cannot apply `not contains x%y` as y can be somewhere else
		return sb.And(
			sb.NotILike(fieldName, fmt.Sprintf(`%%%s%%`, formattedValue)),
		), nil
	}
	return "", qbtypes.ErrUnsupportedOperator
}
