package prometheus

import (
	"github.com/prometheus/prometheus/promql/parser"
)

func NewParser() Parser {
	return parser.NewParser(parser.Options{})
}
