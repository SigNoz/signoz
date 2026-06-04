package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type MatchType struct {
	valuer.String
}

var (
	AtleastOnce        = MatchType{valuer.NewString("1")}
	AtleastOnceLiteral = MatchType{valuer.NewString("at_least_once")}

	AllTheTimes        = MatchType{valuer.NewString("2")}
	AllTheTimesLiteral = MatchType{valuer.NewString("all_the_times")}

	OnAverage        = MatchType{valuer.NewString("3")}
	OnAverageLiteral = MatchType{valuer.NewString("on_average")}
	OnAverageShort   = MatchType{valuer.NewString("avg")}

	InTotal        = MatchType{valuer.NewString("4")}
	InTotalLiteral = MatchType{valuer.NewString("in_total")}
	InTotalShort   = MatchType{valuer.NewString("sum")}

	Last        = MatchType{valuer.NewString("5")}
	LastLiteral = MatchType{valuer.NewString("last")}
)

func (MatchType) Enum() []any {
	return []any{
		AtleastOnceLiteral,
		AllTheTimesLiteral,
		OnAverageLiteral,
		InTotalLiteral,
		LastLiteral,
	}
}

// Normalize returns the canonical (numeric) form of the match type.
func (m MatchType) Normalize() MatchType {
	switch m {
	case AtleastOnce, AtleastOnceLiteral:
		return AtleastOnce
	case AllTheTimes, AllTheTimesLiteral:
		return AllTheTimes
	case OnAverage, OnAverageLiteral, OnAverageShort:
		return OnAverage
	case InTotal, InTotalLiteral, InTotalShort:
		return InTotal
	case Last, LastLiteral:
		return Last
	default:
		return m
	}
}

// Literal returns the canonical literal (string) form of the match type.
func (m MatchType) Literal() string {
	switch m.Normalize() {
	case AtleastOnce:
		return AtleastOnceLiteral.StringValue()
	case AllTheTimes:
		return AllTheTimesLiteral.StringValue()
	case OnAverage:
		return OnAverageLiteral.StringValue()
	case InTotal:
		return InTotalLiteral.StringValue()
	case Last:
		return LastLiteral.StringValue()
	default:
		return m.StringValue()
	}
}

func (m MatchType) Validate() error {
	switch m {
	case
		AtleastOnce,
		AtleastOnceLiteral,
		AllTheTimes,
		AllTheTimesLiteral,
		OnAverage,
		OnAverageLiteral,
		OnAverageShort,
		InTotal,
		InTotalLiteral,
		InTotalShort,
		Last,
		LastLiteral:
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.matchType: unsupported value %q; must be one of at_least_once, all_the_times, on_average, in_total, last", m.StringValue())
	}
}
