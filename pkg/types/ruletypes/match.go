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
	AtleastOnceLiteral = MatchType{valuer.NewString("atleast_once")}

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
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown match type operator, known values are")
	}
}
