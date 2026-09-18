package ruletypes

import (
	"cmp"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
)

const MaxListLabelPairs = 1000

// ListableRule is the slim per-row shape of the list endpoint; the full rule stays behind get-by-id.
type ListableRule struct {
	Id          string            `json:"id" required:"true"`
	State       AlertState        `json:"state" required:"true"`
	AlertName   string            `json:"alert" required:"true"`
	Description string            `json:"description,omitempty"`
	AlertType   AlertType         `json:"alertType" required:"true"`
	RuleType    RuleType          `json:"ruleType" required:"true"`
	Disabled    bool              `json:"disabled"`
	Labels      map[string]string `json:"labels,omitempty"`
	types.TimeAuditable
	types.UserAuditable
}

func NewListableRule(rule *GettableRule) *ListableRule {
	listable := &ListableRule{
		Id:          rule.Id,
		State:       rule.State,
		AlertName:   rule.AlertName,
		Description: rule.Description,
		AlertType:   rule.AlertType,
		RuleType:    rule.RuleType,
		Disabled:    rule.Disabled,
		Labels:      rule.Labels,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: rule.CreatedAt,
			UpdatedAt: rule.UpdatedAt,
		},
	}
	if rule.CreatedBy != nil {
		listable.CreatedBy = *rule.CreatedBy
	}
	if rule.UpdatedBy != nil {
		listable.UpdatedBy = *rule.UpdatedBy
	}
	return listable
}

// LabelPair is one distinct label key/value observed on the org's rules.
type LabelPair struct {
	Key   string `json:"key" required:"true"`
	Value string `json:"value" required:"true"`
}

type ListableRules struct {
	Rules            []*ListableRule `json:"rules" required:"true" nullable:"false"`
	Total            int64           `json:"total" required:"true"`
	Labels           []LabelPair     `json:"labels" required:"true" nullable:"false"`
	ReservedKeywords []DSLKey        `json:"reservedKeywords" required:"true" nullable:"false"`
}

func NewListableRules(rules []*ListableRule, total int64, labels []LabelPair) *ListableRules {
	return &ListableRules{
		Rules:            rules,
		Total:            total,
		Labels:           labels,
		ReservedKeywords: ReservedFilterKeys(),
	}
}

// Display priority, worst first; NOT AlertState.Severity(), which ranks disabled/nodata above firing.
var stateDisplayRank = map[AlertState]int{
	StateFiring:     5,
	StatePending:    4,
	StateRecovering: 3,
	StateNoData:     2,
	StateInactive:   1,
	StateDisabled:   0,
}

var severityDisplayRank = map[string]int{
	"critical": 4,
	"error":    3,
	"warning":  2,
	"info":     1,
}

// Ties break on name then id ascending (order applies to the primary key only) so pages stay stable.
func SortListableRules(rules []*ListableRule, sortBy ListSort, order ListOrder) {
	direction := 1
	if order == ListOrderDesc {
		direction = -1
	}
	slices.SortStableFunc(rules, func(a, b *ListableRule) int {
		if c := direction * compareListableRules(a, b, sortBy); c != 0 {
			return c
		}
		if c := strings.Compare(strings.ToLower(a.AlertName), strings.ToLower(b.AlertName)); c != 0 {
			return c
		}
		return strings.Compare(a.Id, b.Id)
	})
}

func compareListableRules(a, b *ListableRule, sortBy ListSort) int {
	switch sortBy {
	case ListSortName:
		return strings.Compare(strings.ToLower(a.AlertName), strings.ToLower(b.AlertName))
	case ListSortCreatedAt:
		return a.CreatedAt.Compare(b.CreatedAt)
	case ListSortState:
		return cmp.Compare(stateDisplayRank[a.State], stateDisplayRank[b.State])
	case ListSortSeverity:
		severityA := a.Labels["severity"]
		severityB := b.Labels["severity"]
		rankA := severityDisplayRank[strings.ToLower(severityA)]
		rankB := severityDisplayRank[strings.ToLower(severityB)]
		if rankA != rankB {
			return cmp.Compare(rankA, rankB)
		}
		if rankA == 0 {
			return strings.Compare(strings.ToLower(severityA), strings.ToLower(severityB))
		}
		return 0
	}
	return a.UpdatedAt.Compare(b.UpdatedAt)
}

// NewLabelPairsFromRawJSON skips blank or malformed entries and caps the result at limit.
func NewLabelPairsFromRawJSON(raws []string, limit int) []LabelPair {
	set := make(map[LabelPair]struct{})
	for _, raw := range raws {
		if raw == "" || raw == "null" {
			continue
		}
		labels := make(map[string]string)
		if err := json.Unmarshal([]byte(raw), &labels); err != nil {
			continue
		}
		for key, value := range labels {
			set[LabelPair{Key: key, Value: value}] = struct{}{}
		}
	}

	pairs := make([]LabelPair, 0, len(set))
	for pair := range set {
		pairs = append(pairs, pair)
	}
	slices.SortFunc(pairs, func(a, b LabelPair) int {
		if c := strings.Compare(a.Key, b.Key); c != 0 {
			return c
		}
		return strings.Compare(a.Value, b.Value)
	})
	if len(pairs) > limit {
		pairs = pairs[:limit]
	}
	return pairs
}
