package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Seasonality struct {
	valuer.UnsetOrNonEmptyString
}

var (
	SeasonalityHourly = Seasonality{valuer.MustNewUnsetOrNonEmptyString("hourly")}
	SeasonalityDaily  = Seasonality{valuer.MustNewUnsetOrNonEmptyString("daily")}
	SeasonalityWeekly = Seasonality{valuer.MustNewUnsetOrNonEmptyString("weekly")}
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
