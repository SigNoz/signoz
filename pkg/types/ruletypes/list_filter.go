package ruletypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

var ErrCodeRuleListFilterInvalid = errors.MustNewCode("rule_list_filter_invalid")

// DSLKey is a reserved (column-level) key in the rule list filter DSL.
type DSLKey string

const (
	DSLKeyName      DSLKey = "name"
	DSLKeySeverity  DSLKey = "severity"
	DSLKeyCreatedBy DSLKey = "created_by"
	DSLKeyUpdatedBy DSLKey = "updated_by"
	DSLKeyCreatedAt DSLKey = "created_at"
	DSLKeyUpdatedAt DSLKey = "updated_at"
	DSLKeyAlertType DSLKey = "alert_type"
	DSLKeyRuleType  DSLKey = "rule_type"

	// DSLLabelsKeyPrefix namespaces rule-label lookups; label keys are
	// matched exactly (case-sensitive).
	DSLLabelsKeyPrefix = "labels."

	// DSLKeyLabelsPlaceholder is the literal advertised in reservedKeywords so
	// clients know the labels namespace exists; it is not itself a filterable key.
	DSLKeyLabelsPlaceholder DSLKey = "labels.<key>"
)

func ReservedFilterKeys() []DSLKey {
	keys := make([]DSLKey, 0, len(ReservedOps)+1)
	for key := range ReservedOps {
		keys = append(keys, key)
	}
	keys = append(keys, DSLKeyLabelsPlaceholder)
	slices.SortFunc(keys, func(a, b DSLKey) int {
		return strings.Compare(string(a), string(b))
	})
	return keys
}

// ReservedOps lists the operators each reserved DSL key accepts; `labels.<key>`
// terms use LabelsKeyOps.
var ReservedOps = map[DSLKey]map[qbtypesv5.FilterOperator]struct{}{
	DSLKeyName: stringSearchOps(),
	// severity is an alias for labels.severity, so it takes the labels
	// operator set, including EXISTS/NOT EXISTS.
	DSLKeySeverity:  LabelsKeyOps,
	DSLKeyCreatedBy: stringSearchOps(),
	DSLKeyUpdatedBy: stringSearchOps(),
	DSLKeyCreatedAt: numericRangeOps(),
	DSLKeyUpdatedAt: numericRangeOps(),
	DSLKeyAlertType: enumOps(),
	DSLKeyRuleType:  enumOps(),
}

// LabelsKeyOps applies to every `labels.<key>` term: the operator targets the
// label's value; EXISTS/NOT EXISTS test the label's presence.
var LabelsKeyOps = opsSet(
	qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
	qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike,
	qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike,
	qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains,
	qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn,
	qbtypesv5.FilterOperatorExists, qbtypesv5.FilterOperatorNotExists,
)

func stringSearchOps() map[qbtypesv5.FilterOperator]struct{} {
	return opsSet(
		qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike,
		qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike,
		qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains,
		qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn,
	)
}

func numericRangeOps() map[qbtypesv5.FilterOperator]struct{} {
	return opsSet(
		qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLessThan, qbtypesv5.FilterOperatorLessThanOrEq,
		qbtypesv5.FilterOperatorGreaterThan, qbtypesv5.FilterOperatorGreaterThanOrEq,
		qbtypesv5.FilterOperatorBetween, qbtypesv5.FilterOperatorNotBetween,
	)
}

func enumOps() map[qbtypesv5.FilterOperator]struct{} {
	return opsSet(
		qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn,
	)
}

func opsSet(ops ...qbtypesv5.FilterOperator) map[qbtypesv5.FilterOperator]struct{} {
	m := make(map[qbtypesv5.FilterOperator]struct{}, len(ops))
	for _, op := range ops {
		m[op] = struct{}{}
	}
	return m
}
