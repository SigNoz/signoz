package alertmanagertypes

import (
	"slices"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	DefaultChannelListLimit = 20
	MaxChannelListLimit     = 200
	MaxChannelListQueryLen  = 1024
)

var ErrCodeChannelListInvalid = errors.MustNewCode("alertmanager_channel_list_invalid")

// ChannelListSort is a closed enum so callers cannot order by arbitrary columns.
type ChannelListSort struct{ valuer.String }

var (
	ChannelListSortUpdatedAt = ChannelListSort{valuer.NewString("updated_at")}
	ChannelListSortCreatedAt = ChannelListSort{valuer.NewString("created_at")}
	ChannelListSortName      = ChannelListSort{valuer.NewString("name")}
)

func (ChannelListSort) Enum() []any {
	return []any{ChannelListSortUpdatedAt, ChannelListSortCreatedAt, ChannelListSortName}
}

func (s ChannelListSort) IsValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}

// ToColumn returns the column the sort orders by. Sorting by name orders by the
// display name, which is what a caller sees, rather than by the DNS1123 name.
func (s ChannelListSort) ToColumn() string {
	if s == ChannelListSortName {
		return "display_name"
	}

	return s.StringValue()
}

type ChannelListOrder struct{ valuer.String }

var (
	ChannelListOrderAsc  = ChannelListOrder{valuer.NewString("asc")}
	ChannelListOrderDesc = ChannelListOrder{valuer.NewString("desc")}
)

func (ChannelListOrder) Enum() []any {
	return []any{ChannelListOrderAsc, ChannelListOrderDesc}
}

func (o ChannelListOrder) IsValid() bool {
	return slices.ContainsFunc(o.Enum(), func(v any) bool { return v == o })
}

// ListChannelsParams filters and orders the channel list. Query matches the
// display name case-insensitively.
type ListChannelsParams struct {
	Query  string           `query:"query" json:"query"`
	Kind   ChannelKind      `query:"kind" json:"kind"`
	Sort   ChannelListSort  `query:"sort" json:"sort"`
	Order  ChannelListOrder `query:"order" json:"order"`
	Limit  int              `query:"limit" json:"limit"`
	Offset int              `query:"offset" json:"offset"`
}

func (p *ListChannelsParams) Validate() error {
	if n := utf8.RuneCountInString(p.Query); n > MaxChannelListQueryLen {
		return errors.NewInvalidInputf(ErrCodeChannelListInvalid,
			"query cannot be longer than %d characters, got %d", MaxChannelListQueryLen, n)
	}

	if !p.Kind.IsZero() && !p.Kind.IsValid() {
		return ErrUnsupportedChannelKind(p.Kind.StringValue())
	}

	if !p.Sort.IsZero() && !p.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeChannelListInvalid,
			"invalid sort %q — expected one of: %s", p.Sort, formatAllowedValues(ChannelListSort{}.Enum()))
	}

	if !p.Order.IsZero() && !p.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeChannelListInvalid,
			"invalid order %q — expected one of: %s", p.Order, formatAllowedValues(ChannelListOrder{}.Enum()))
	}

	if p.Sort.IsZero() {
		p.Sort = ChannelListSortUpdatedAt
	}

	if p.Order.IsZero() {
		p.Order = ChannelListOrderDesc
	}

	if p.Limit == 0 {
		p.Limit = DefaultChannelListLimit
	} else if p.Limit < 0 {
		return errors.NewInvalidInputf(ErrCodeChannelListInvalid,
			"invalid limit %d — must be a positive integer", p.Limit)
	} else if p.Limit > MaxChannelListLimit {
		p.Limit = MaxChannelListLimit
	}

	if p.Offset < 0 {
		return errors.NewInvalidInputf(ErrCodeChannelListInvalid,
			"invalid offset %d — must be a non-negative integer", p.Offset)
	}

	return nil
}
