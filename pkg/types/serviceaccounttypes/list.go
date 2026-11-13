package serviceaccounttypes

import (
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	DefaultServiceAccountListLimit = 20
	MaxServiceAccountListLimit     = 200
	MaxServiceAccountListQueryLen  = 1024
)

var (
	ServiceAccountListSortCreatedAt = ServiceAccountListSort{valuer.NewString("created_at")}
	ServiceAccountListSortUpdatedAt = ServiceAccountListSort{valuer.NewString("updated_at")}
	ServiceAccountListSortName      = ServiceAccountListSort{valuer.NewString("name")}
)

var (
	ServiceAccountListOrderAsc  = ServiceAccountListOrder{valuer.NewString("asc")}
	ServiceAccountListOrderDesc = ServiceAccountListOrder{valuer.NewString("desc")}
)

type ServiceAccountListSort struct{ valuer.String }

type ServiceAccountListOrder struct{ valuer.String }

type ListServiceAccountsParams struct {
	Query  string                  `query:"query" json:"query" description:"A filter expression over the reserved keys name, email, status, created_at and updated_at using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'ci' AND status = 'active'. A bare or quoted token without a key matches name or email case-insensitively. At most 1024 characters. Empty matches every service account."`
	Sort   ServiceAccountListSort  `query:"sort" json:"sort" description:"The sort column: created_at (default), updated_at or name."`
	Order  ServiceAccountListOrder `query:"order" json:"order" description:"The sort order: asc or desc (default)."`
	Limit  int                     `query:"limit" json:"limit" description:"The page size; defaults to 20 and is capped at 200."`
	Offset int                     `query:"offset" json:"offset" description:"The number of service accounts to skip; defaults to 0."`
}

type ListableServiceAccount struct {
	ServiceAccounts  []*ServiceAccount `json:"serviceAccounts" required:"true" nullable:"false" description:"The service accounts on this page."`
	Total            int64             `json:"total" required:"true" description:"The number of service accounts the filter matches across all pages."`
	ReservedKeywords []DSLKey          `json:"reservedKeywords" required:"true" nullable:"false" description:"The filter keys the query accepts."`
}

func NewListableServiceAccount(serviceAccounts []*ServiceAccount, total int64) *ListableServiceAccount {
	return &ListableServiceAccount{ServiceAccounts: serviceAccounts, Total: total, ReservedKeywords: ReservedFilterKeys()}
}

func (ServiceAccountListSort) Enum() []any {
	return []any{ServiceAccountListSortCreatedAt, ServiceAccountListSortUpdatedAt, ServiceAccountListSortName}
}

func (sort ServiceAccountListSort) IsValid() bool {
	return slices.ContainsFunc(sort.Enum(), func(value any) bool { return value == sort })
}

func (ServiceAccountListOrder) Enum() []any {
	return []any{ServiceAccountListOrderAsc, ServiceAccountListOrderDesc}
}

func (order ServiceAccountListOrder) IsValid() bool {
	return slices.ContainsFunc(order.Enum(), func(value any) bool { return value == order })
}

func (params *ListServiceAccountsParams) Validate() error {
	if count := utf8.RuneCountInString(params.Query); count > MaxServiceAccountListQueryLen {
		return errors.NewInvalidInputf(ErrCodeServiceAccountInvalidInput, "query cannot be longer than %d characters, got %d", MaxServiceAccountListQueryLen, count)
	}

	if !params.Sort.IsZero() && !params.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeServiceAccountInvalidInput, "invalid sort %q, expected one of: %s", params.Sort, formatAllowedValues(ServiceAccountListSort{}.Enum()))
	}

	if !params.Order.IsZero() && !params.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeServiceAccountInvalidInput, "invalid order %q, expected one of: %s", params.Order, formatAllowedValues(ServiceAccountListOrder{}.Enum()))
	}

	if params.Sort.IsZero() {
		params.Sort = ServiceAccountListSortCreatedAt
	}

	if params.Order.IsZero() {
		params.Order = ServiceAccountListOrderDesc
	}

	if params.Limit == 0 {
		params.Limit = DefaultServiceAccountListLimit
	} else if params.Limit < 0 {
		return errors.NewInvalidInputf(ErrCodeServiceAccountInvalidInput, "invalid limit %d, must be a positive integer", params.Limit)
	} else if params.Limit > MaxServiceAccountListLimit {
		params.Limit = MaxServiceAccountListLimit
	}

	if params.Offset < 0 {
		return errors.NewInvalidInputf(ErrCodeServiceAccountInvalidInput, "invalid offset %d, must be a non-negative integer", params.Offset)
	}

	return nil
}

func formatAllowedValues(enum []any) string {
	values := make([]string, 0, len(enum))
	for _, value := range enum {
		stringValuer, ok := value.(interface{ StringValue() string })
		if !ok {
			continue
		}

		values = append(values, "`"+stringValuer.StringValue()+"`")
	}
	slices.Sort(values)

	return strings.Join(values, ", ")
}
