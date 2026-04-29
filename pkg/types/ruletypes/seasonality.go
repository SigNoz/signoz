package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Seasonality struct {
	valuer.String
}

var (
	SeasonalityHourly = Seasonality{valuer.NewString("hourly")}
	SeasonalityDaily  = Seasonality{valuer.NewString("daily")}
	SeasonalityWeekly = Seasonality{valuer.NewString("weekly")}
)

func (Seasonality) Enum() []any {
	return []any{
		SeasonalityHourly,
		SeasonalityDaily,
		SeasonalityWeekly,
	}
}

func (s Seasonality) Validate() error {
	switch s {
	case SeasonalityHourly, SeasonalityDaily, SeasonalityWeekly:
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.seasonality: unsupported value %q; must be one of hourly, daily, weekly",
			s.StringValue())
	}
}
