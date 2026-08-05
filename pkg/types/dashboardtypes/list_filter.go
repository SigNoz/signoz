package dashboardtypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

var ErrCodeDashboardListFilterInvalid = errors.MustNewCode("dashboard_list_filter_invalid")

// ReservedFilterKeys returns the reserved (column-level) DSL keys the list
// filter accepts, sorted alphabetically. The list API surfaces these so clients
// can distinguish reserved keywords from tag keys when building filters.
func ReservedFilterKeys() []DSLKey {
	keys := make([]DSLKey, 0, len(ReservedOps))
	for key := range ReservedOps {
		keys = append(keys, key)
	}
	slices.SortFunc(keys, func(a, b DSLKey) int {
		return strings.Compare(string(a), string(b))
	})
	return keys
}

// ReservedOps lists the operators each reserved (column-level) DSL key accepts.
// Any non-reserved key is treated as a tag key and uses TagKeyOps.
var ReservedOps = map[DSLKey]map[qbtypesv5.FilterOperator]struct{}{
	DSLKeyName:        stringSearchOps(),
	DSLKeyDescription: stringSearchOps(),
	DSLKeyCreatedAt:   numericRangeOps(),
	DSLKeyUpdatedAt:   numericRangeOps(),
	DSLKeyCreatedBy:   stringSearchOps(),
	DSLKeyLocked:      opsSet(qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual),
}

// TagKeyOps applies to every non-reserved DSL key — the operator targets the
// tag's value with an implicit case-insensitive match on the tag's key.
var TagKeyOps = opsSet(
	qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
	qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike,
	qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike,
	qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains,
	qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp,
	qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn,
	qbtypesv5.FilterOperatorExists, qbtypesv5.FilterOperatorNotExists,
)

func stringSearchOps() map[qbtypesv5.FilterOperator]struct{} {
	return opsSet(
		qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike,
		qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike,
		qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains,
		qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp,
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

func opsSet(ops ...qbtypesv5.FilterOperator) map[qbtypesv5.FilterOperator]struct{} {
	m := make(map[qbtypesv5.FilterOperator]struct{}, len(ops))
	for _, op := range ops {
		m[op] = struct{}{}
	}
	return m
}
