package serviceaccounttypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const (
	DSLKeyName      DSLKey = "name"
	DSLKeyEmail     DSLKey = "email"
	DSLKeyStatus    DSLKey = "status"
	DSLKeyCreatedAt DSLKey = "created_at"
	DSLKeyUpdatedAt DSLKey = "updated_at"
)

var ErrCodeServiceAccountListFilterInvalid = errors.MustNewCode("service_account_list_filter_invalid")

var ReservedOps = map[DSLKey]map[qbtypesv5.FilterOperator]struct{}{
	DSLKeyName:      stringSearchOps(),
	DSLKeyEmail:     stringSearchOps(),
	DSLKeyStatus:    opsSet(qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual, qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn),
	DSLKeyCreatedAt: numericRangeOps(),
	DSLKeyUpdatedAt: numericRangeOps(),
}

type DSLKey string

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
	set := make(map[qbtypesv5.FilterOperator]struct{}, len(ops))
	for _, op := range ops {
		set[op] = struct{}{}
	}
	return set
}
