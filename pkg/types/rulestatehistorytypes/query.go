package rulestatehistorytypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Query struct {
	Start            int64
	End              int64
	State            AlertState
	FilterExpression qbtypes.Filter
	Limit            int64
	Offset           int64
	Order            qbtypes.OrderDirection
}

func (q *Query) Validate() error {
	if q.Start == 0 || q.End == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start and end are required")
	}
	if q.Start >= q.End {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be less than end")
	}
	if q.Limit < 0 || q.Offset < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit and offset must be greater than or equal to 0")
	}
	if q.Order.IsZero() {
		q.Order = qbtypes.OrderDirectionDesc
	}
	if q.Order != qbtypes.OrderDirectionAsc && q.Order != qbtypes.OrderDirectionDesc {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "order must be asc or desc")
	}
	return nil
}
