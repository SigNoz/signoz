package rules

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// A Rule encapsulates a vector expression which is evaluated at a specified
// interval and acted upon (currently used for alerting).
type Rule interface {
	ID() string
	Name() string
	Type() ruletypes.RuleType

	Labels() labels.BaseLabels
	Annotations() labels.BaseLabels
	Condition() *ruletypes.RuleCondition
	EvalDelay() time.Duration
	EvalWindow() time.Duration
	HoldDuration() time.Duration
	State() model.AlertState
	ActiveAlerts() []*ruletypes.Alert
	// ActiveAlertsLabelFP returns a map of active alert labels fingerprint
	ActiveAlertsLabelFP() map[uint64]struct{}

	PreferredChannels() []string

	Eval(context.Context, time.Time) (interface{}, error)
	String() string
	SetLastError(error)
	LastError() error
	SetHealth(ruletypes.RuleHealth)
	Health() ruletypes.RuleHealth
	SetEvaluationDuration(time.Duration)
	GetEvaluationDuration() time.Duration
	SetEvaluationTimestamp(time.Time)
	GetEvaluationTimestamp() time.Time

	RecordRuleStateHistory(ctx context.Context, prevState, currentState model.AlertState, itemsToAdd []model.RuleStateHistory) error

	SendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc)
}
