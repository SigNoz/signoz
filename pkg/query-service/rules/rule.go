package rules

import (
	"context"
	"go.signoz.io/query-service/utils/labels"
	"net/url"
	"time"
)

// A Rule encapsulates a vector expression which is evaluated at a specified
// interval and acted upon (currently used for alerting).
type Rule interface {
	Name() string
	Type() RuleType

	Labels() labels.BaseLabels

	Eval(context.Context, time.Time, *Queriers, *url.URL) (interface{}, error)
	String() string
	// Query() string
	SetLastError(error)
	LastError() error
	SetHealth(RuleHealth)
	Health() RuleHealth
	SetEvaluationDuration(time.Duration)
	GetEvaluationDuration() time.Duration
	SetEvaluationTimestamp(time.Time)
	GetEvaluationTimestamp() time.Time
}
