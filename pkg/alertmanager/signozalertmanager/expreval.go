package signozalertmanager

import (
	"log/slog"
	"strings"
	"sync"

	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"
)

// convertLabelSetToEnv converts a flat label set with dotted keys into a nested map
// structure for expr-lang evaluation. When both a leaf and a deeper nested path exist
// (e.g. "foo" and "foo.bar"), the nested structure takes precedence.
func convertLabelSetToEnv(labelSet model.LabelSet) map[string]interface{} {
	env := make(map[string]interface{})

	for lk, lv := range labelSet {
		key := strings.TrimSpace(string(lk))
		value := string(lv)

		if strings.Contains(key, ".") {
			parts := strings.Split(key, ".")
			current := env

			for i, raw := range parts {
				part := strings.TrimSpace(raw)

				last := i == len(parts)-1
				if last {
					if _, isMap := current[part].(map[string]interface{}); isMap {
						break
					}
					current[part] = value
					break
				}

				if nextMap, ok := current[part].(map[string]interface{}); ok {
					current = nextMap
					continue
				}

				newMap := make(map[string]interface{})
				current[part] = newMap
				current = newMap
			}
			continue
		}

		if _, isMap := env[key].(map[string]interface{}); isMap {
			continue
		}
		env[key] = value
	}

	return env
}

// evaluateExpr compiles and runs an expr-lang expression against the given label set.
func evaluateExpr(expression string, labelSet model.LabelSet) (bool, error) {
	env := convertLabelSetToEnv(labelSet)

	program, err := expr.Compile(expression, expr.Env(env))
	if err != nil {
		return false, err
	}

	output, err := expr.Run(program, env)
	if err != nil {
		return false, err
	}

	if boolVal, ok := output.(bool); ok {
		return boolVal, nil
	}

	return false, nil
}

// activeMaintenanceExpr holds an active maintenance's scoping criteria.
// Muting logic: (ruleIDs match OR ruleIDs empty) AND (expression match OR expression empty).
type activeMaintenanceExpr struct {
	ruleIDs    []string
	expression string
}

// MaintenanceExprMuter implements types.Muter for expression-based maintenance scoping.
// It evaluates expr-lang expressions against alert labels to determine if an alert
// should be muted (suppressed) during a maintenance window.
type MaintenanceExprMuter struct {
	mu          sync.RWMutex
	expressions []activeMaintenanceExpr
	logger      *slog.Logger
}

// NewMaintenanceExprMuter creates a new MaintenanceExprMuter.
func NewMaintenanceExprMuter(logger *slog.Logger) *MaintenanceExprMuter {
	return &MaintenanceExprMuter{
		logger: logger,
	}
}

// Mutes returns true if the given label set matches any active maintenance entry.
// Each entry uses AND logic: (ruleIDs match OR empty) AND (expression match OR empty).
// Empty ruleIDs means all rules are in scope. Empty expression means all labels match.
func (m *MaintenanceExprMuter) Mutes(labels model.LabelSet) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, ae := range m.expressions {
		// Check rule scope: empty ruleIDs means all rules match.
		ruleMatch := len(ae.ruleIDs) == 0
		if !ruleMatch {
			alertRuleID := string(labels["ruleId"])
			for _, rid := range ae.ruleIDs {
				if rid == alertRuleID {
					ruleMatch = true
					break
				}
			}
		}
		if !ruleMatch {
			continue
		}

		// Check expression scope: empty expression means all labels match.
		if ae.expression == "" {
			return true
		}

		matched, err := evaluateExpr(ae.expression, labels)
		if err != nil {
			m.logger.Error("failed to evaluate maintenance expression",
				"expression", ae.expression,
				"error", err)
			continue
		}
		if matched {
			return true
		}
	}
	return false
}

// SetActiveExpressions updates the list of active maintenance expressions.
func (m *MaintenanceExprMuter) SetActiveExpressions(exprs []activeMaintenanceExpr) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.expressions = exprs
}
