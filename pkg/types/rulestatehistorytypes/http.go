package rulestatehistorytypes

import qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"

// V2HistoryBaseQueryParams defines URL query params common across v2 rule history APIs.
type V2HistoryBaseQueryParams struct {
	Start int64 `query:"start" required:"true"`
	End   int64 `query:"end" required:"true"`
}

// V2HistoryTimelineQueryParams defines URL query params for timeline API.
type V2HistoryTimelineQueryParams struct {
	Start            int64                  `query:"start" required:"true"`
	End              int64                  `query:"end" required:"true"`
	State            AlertState             `query:"state"`
	FilterExpression string                 `query:"filterExpression"`
	Limit            int64                  `query:"limit"`
	Order            qbtypes.OrderDirection `query:"order"`
	Cursor           string                 `query:"cursor"`
}
