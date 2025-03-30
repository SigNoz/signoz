package prometheus

import (
	"fmt"

	"github.com/prometheus/common/model"
)

var _ fmt.Stringer = Query{}

type Query struct {
	Start    model.Time
	End      model.Time
	Matchers Matchers
}

func (q Query) String() string {
	return fmt.Sprintf("[%d,%d,%s]", q.Start, q.End, q.Matchers)
}
