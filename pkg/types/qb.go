package types

type FilterOperator int

const (
	FilterOperatorUnknown FilterOperator = iota
	FilterOperatorEqual
	FilterOperatorNotEqual
	FilterOperatorGreaterThan
	FilterOperatorGreaterThanOrEq
	FilterOperatorLessThan
	FilterOperatorLessThanOrEq

	FilterOperatorLike
	FilterOperatorNotLike
	FilterOperatorILike
	FilterOperatorNotILike

	FilterOperatorBetween
	FilterOperatorNotBetween

	FilterOperatorIn
	FilterOperatorNotIn

	FilterOperatorExists
	FilterOperatorNotExists

	FilterOperatorRegexp
	FilterOperatorNotRegexp

	FilterOperatorContains
	FilterOperatorNotContains
)
