package queues

import (
	"fmt"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type QueueListRequest struct {
	Start   int64         `json:"start"` // unix nano
	End     int64         `json:"end"`   // unix nano
	Filters *v3.FilterSet `json:"filters"`
	Limit   int           `json:"limit"`
}

func (qr *QueueListRequest) Validate() error {

	err := qr.Filters.Validate()
	if err != nil {
		return err
	}

	if qr.Start < 0 || qr.End < 0 {
		return fmt.Errorf("start and end must be unixnano time")
	}
	return nil
}
