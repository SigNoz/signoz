package rulestatehistorytypes

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// PostableRuleStateHistoryBaseQuery defines URL query params common across v2 rule history APIs.
type PostableRuleStateHistoryBaseQuery struct {
	Start int64 `query:"start" required:"true"`
	End   int64 `query:"end" required:"true"`
}

// PostableRuleStateHistoryTimelineQuery defines URL query params for timeline API.
type PostableRuleStateHistoryTimelineQuery struct {
	Start            int64                  `query:"start" required:"true"`
	End              int64                  `query:"end" required:"true"`
	State            ruletypes.AlertState   `query:"state"`
	FilterExpression string                 `query:"filterExpression"`
	Limit            int64                  `query:"limit"`
	Order            qbtypes.OrderDirection `query:"order"`
	Cursor           string                 `query:"cursor"`
}
