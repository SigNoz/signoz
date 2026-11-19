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
	Id          string            `json:"id" required:"true" description:"The unique identifier of the rule."`
	State       AlertState        `json:"state" required:"true" description:"The current evaluation state: inactive, pending, recovering, firing, nodata or disabled."`
	AlertName   string            `json:"alert" required:"true" description:"The display name of the alert rule."`
	Description string            `json:"description,omitempty" description:"A human readable description of what the rule monitors."`
	AlertType   AlertType         `json:"alertType" required:"true" description:"The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT."`
	RuleType    RuleType          `json:"ruleType" required:"true" description:"The evaluation strategy: threshold_rule, promql_rule or anomaly_rule."`
	Disabled    bool              `json:"disabled" description:"Whether the rule is paused."`
	Labels      map[string]string `json:"labels,omitempty" description:"The labels attached to alerts the rule fires."`
	Thresholds  []string          `json:"thresholds" required:"true" nullable:"false" description:"The rule's threshold names in lowercase, deduplicated and ordered critical, error, warning, info, then other names. An alert carries the name of the threshold that fired as its severity. Read-only."`
	types.TimeAuditable
	types.UserAuditable
}

// storedRuleData is the subset of the persisted rule data blob the list page needs.
type storedRuleData struct {
	AlertName   string            `json:"alert"`
	Description string            `json:"description"`
	AlertType   AlertType         `json:"alertType"`
	RuleType    RuleType          `json:"ruleType"`
	Disabled    bool              `json:"disabled"`
	Labels      map[string]string `json:"labels"`
	Condition   struct {
		CompositeQuery struct {
			QueryType QueryType `json:"queryType"`
		} `json:"compositeQuery"`
		Thresholds *RuleThresholdData `json:"thresholds"`
	} `json:"condition"`
}

func (data storedRuleData) extractThresholdNames() []string {
	names := make([]string, 0)
	if data.Condition.Thresholds != nil {
		if basic, ok := data.Condition.Thresholds.Spec.(BasicRuleThresholds); ok {
			for _, threshold := range basic {
				name := strings.ToLower(threshold.Name)
				if !slices.Contains(names, name) {
					names = append(names, name)
				}
			}
		}
	}
	slices.SortFunc(names, func(a, b string) int {
		return cmp.Or(cmp.Compare(severityDisplayRank[b], severityDisplayRank[a]), strings.Compare(a, b))
	})
	return names
}

// ToListableRule leaves State zero; the caller overlays evaluation state.
func (rule *StorableRule) ToListableRule() (*ListableRule, error) {
	data := storedRuleData{}
	if err := json.Unmarshal([]byte(rule.Data), &data); err != nil {
		return nil, err
	}

	switch data.Condition.CompositeQuery.QueryType {
	case QueryTypeBuilder, QueryTypeClickHouseSQL:
		if data.RuleType.IsZero() {
			data.RuleType = RuleTypeThreshold
		}
	case QueryTypePromQL:
		data.RuleType = RuleTypeProm
	}

	return &ListableRule{
		Id:            rule.ID.StringValue(),
		AlertName:     data.AlertName,
		Description:   data.Description,
		AlertType:     data.AlertType,
		RuleType:      data.RuleType,
		Disabled:      data.Disabled,
		Labels:        data.Labels,
		Thresholds:    data.extractThresholdNames(),
		TimeAuditable: rule.TimeAuditable,
		UserAuditable: rule.UserAuditable,
	}, nil
}

// NewListableRulesFromStorableRules converts rows, overlays evaluation state (absent means
// disabled) and applies the state filter; corrupt rows come back keyed by rule id for the
// caller to log.
func NewListableRulesFromStorableRules(storedRules []*StorableRule, stateByRuleID map[string]AlertState, stateFilter map[AlertState]struct{}) ([]*ListableRule, map[string]error) {
	listableRules := make([]*ListableRule, 0, len(storedRules))
	errByRuleID := make(map[string]error)

	for _, rule := range storedRules {
		listable, err := rule.ToListableRule()
		if err != nil {
			errByRuleID[rule.ID.StringValue()] = err
			continue
		}

		if state, ok := stateByRuleID[listable.Id]; ok {
			listable.State = state
		} else {
			listable.State = StateDisabled
			listable.Disabled = true
		}
		if len(stateFilter) > 0 {
			if _, ok := stateFilter[listable.State]; !ok {
				continue
			}
		}

		listableRules = append(listableRules, listable)
	}

	return listableRules, errByRuleID
}

// LabelPair is one distinct label key/value observed on the org's rules.
type LabelPair struct {
	Key   string `json:"key" required:"true" description:"The label name."`
	Value string `json:"value" required:"true" description:"The label value."`
}

type ListableRules struct {
	Rules            []*ListableRule `json:"rules" required:"true" nullable:"false" description:"The page of rules matching the filter."`
	Total            int64           `json:"total" required:"true" description:"The number of rules matching the filter across all pages."`
	Labels           []LabelPair     `json:"labels" required:"true" nullable:"false" description:"Organization-wide label key and value pair suggestions for building filters, independent of the current filter and page, capped at 1000 distinct pairs."`
	ReservedKeywords []DSLKey        `json:"reservedKeywords" required:"true" nullable:"false" description:"The keys the query filter language reserves, which cannot be used as label names in a query."`
}

func NewListableRules(rules []*ListableRule, total int64, labels []LabelPair) *ListableRules {
	return &ListableRules{
		Rules:            rules,
		Total:            total,
		Labels:           labels,
		ReservedKeywords: ReservedFilterKeys(),
	}
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
		return cmp.Compare(a.State.DisplayRank(), b.State.DisplayRank())
	case ListSortSeverity:
		// a rule sorts by its first threshold name, the highest ranked
		thresholdA, thresholdB := "", ""
		if len(a.Thresholds) > 0 {
			thresholdA = a.Thresholds[0]
		}
		if len(b.Thresholds) > 0 {
			thresholdB = b.Thresholds[0]
		}
		rankA := severityDisplayRank[strings.ToLower(thresholdA)]
		rankB := severityDisplayRank[strings.ToLower(thresholdB)]
		if rankA != rankB {
			return cmp.Compare(rankA, rankB)
		}
		if rankA == 0 {
			return strings.Compare(strings.ToLower(thresholdA), strings.ToLower(thresholdB))
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
