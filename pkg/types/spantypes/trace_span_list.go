package spantypes

import (
	"cmp"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	SpanScopeTrace       SpanScope = "trace"
	SpanScopeChildren    SpanScope = "children"
	SpanScopeDescendants SpanScope = "descendants"
	SpanScopeAncestors   SpanScope = "ancestors"
)

const (
	spanListDefaultLimit = 50
	spanListMaxLimit     = 1000

	spanMatchLimit         = 3
	spanMatchSnippetRadius = 40
	snippetMark            = "…"
)

var (
	ErrCodeTraceSpansInvalidLimit  = errors.MustNewCode("trace_spans_invalid_limit")
	ErrCodeTraceSpansInvalidOffset = errors.MustNewCode("trace_spans_invalid_offset")
	ErrCodeTraceSpansInvalidView   = errors.MustNewCode("trace_spans_invalid_view")
)

// SpanScope says which spans of a trace a list route covers: all of them, or the ones related to one span.
type SpanScope string

type SpanListQuery struct {
	Scope SpanScope
	// ScopeSpanID is the span the scope is relative to. Empty when the scope is the whole trace.
	ScopeSpanID string
	// View is empty when every span the scope covers is wanted.
	View SpanListView
	// Query holds words, a filter expression, or both. Empty when there is nothing to match.
	Query        string
	SelectFields []telemetrytypes.TelemetryFieldKey
	Offset       int
	Limit        int
}

// SpanListPage is one page of a span list picked from the tree, before the stored data of its spans is read.
type SpanListPage struct {
	skeleton *TraceSkeleton
	view     SpanListView
	// total counts the spans the page was cut from.
	total        uint64
	positions    []int32
	selectFields []telemetrytypes.TelemetryFieldKey
	// words holds the free-text terms of the query; warnings holds what the query could not use.
	words    []string
	warnings []string
}

// SpanSearch holds the spans of a trace that match a query.
type SpanSearch struct {
	SpanIDs []string
	// Words holds the free-text terms of the query.
	Words    []string
	Warnings []string
}

func NewSpanListQuery(params *ListTraceSpansParams, scope SpanScope, scopeSpanID string) (*SpanListQuery, error) {
	query := &SpanListQuery{Scope: scope, ScopeSpanID: scopeSpanID, View: params.View, Query: strings.TrimSpace(params.Query), Offset: params.Offset}
	if query.View != "" {
		if err := validateSpanListView(query.View); err != nil {
			return nil, err
		}
	}
	if params.Offset < 0 {
		return nil, errors.NewInvalidInputf(ErrCodeTraceSpansInvalidOffset, "offset cannot be negative, got %d", params.Offset)
	}
	limit, err := pageLimit("limit", params.Limit, spanListDefaultLimit)
	if err != nil {
		return nil, err
	}
	query.Limit = limit

	for _, text := range params.SelectFields {
		if text = strings.TrimSpace(text); text != "" {
			query.SelectFields = append(query.SelectFields, newSelectField(text))
		}
	}
	return query, nil
}

// NewSpanListPage picks the page the query asks for. search holds the spans that match the
// query's text, and is nil when the query has none.
func NewSpanListPage(skeleton *TraceSkeleton, query *SpanListQuery, search *SpanSearch) (*SpanListPage, error) {
	scope, err := skeleton.scopePositions(query.Scope, query.ScopeSpanID)
	if err != nil {
		return nil, err
	}
	if search != nil {
		scope = skeleton.spansAmong(scope, search.SpanIDs)
	}
	page := skeleton.page(scope, query.View, query.Offset, query.Limit)
	page.selectFields = query.SelectFields
	if search != nil {
		page.words, page.warnings = search.Words, search.Warnings
	}
	return page, nil
}

// ReadsAttributes reports whether building the page needs the full stored rows of its spans.
func (page *SpanListPage) ReadsAttributes() bool {
	return len(page.selectFields) > 0 || len(page.words) > 0
}

func (page *SpanListPage) SpanIDs() []string {
	spanIDs := make([]string, 0, len(page.positions))
	for _, i := range page.positions {
		spanIDs = append(spanIDs, page.skeleton.spanID(i))
	}
	return spanIDs
}

// NewSpanList builds the page. rows holds the stored data of its spans, read only for the selected
// fields and the matched words. A selected field no span of the page has is reported as a warning.
func NewSpanList(page *SpanListPage, rows []StorableSpan) *SpanList {
	byID := make(map[string]*StorableSpan, len(rows))
	for i := range rows {
		byID[rows[i].SpanID] = &rows[i]
	}

	skeleton := page.skeleton
	list := &SpanList{Total: page.total, Items: make([]SpanItem, 0, len(page.positions)), Warnings: slices.Clone(page.warnings)}
	found := make([]bool, len(page.selectFields))
	for _, i := range page.positions {
		item := SpanItem{Span: skeleton.span(i), TreeStats: skeleton.treeStats(i), UnmarkedFailureKind: skeleton.unmarkedFailureKind(i)}
		if page.view == SpanListViewAIUsage {
			skeleton.setUsageAttributes(&item.Span, i)
		}
		row := byID[skeleton.spanID(i)]
		item.Span.selectFields(row, page.selectFields, found)
		item.Matches = findWords(row, page.words)
		list.Items = append(list.Items, item)
	}
	for k, field := range page.selectFields {
		if !found[k] && len(list.Items) > 0 {
			list.Warnings = append(list.Warnings, fmt.Sprintf("field `%s` was not found on any returned span", telemetrytypes.TelemetryFieldKeyToText(&field)))
		}
	}
	return list
}

// spanListViews lists every view, in the order they are documented.
func spanListViews() []SpanListView {
	views := make([]SpanListView, 0)
	for _, view := range SpanListView("").Enum() {
		views = append(views, view.(SpanListView))
	}
	return views
}

func validateSpanListView(view SpanListView) error {
	if !slices.Contains(spanListViews(), view) {
		return errors.NewInvalidInputf(ErrCodeTraceSpansInvalidView, "invalid view %q, expected one of error_origins, unmarked_failures, time_spent, ai_usage, links", string(view))
	}
	return nil
}

// newSelectField reads a name into its context and bare name. The data type is not used.
func newSelectField(text string) telemetrytypes.TelemetryFieldKey {
	key := telemetrytypes.GetFieldKeyFromKeyText(text)
	key.FieldDataType = telemetrytypes.FieldDataTypeUnspecified
	return key
}

// selectFields fills span with the selected fields of row and marks in found the ones row has. A
// name is read as a trace list query reads it: a field of the span itself first, then an attribute.
func (span *Span) selectFields(row *StorableSpan, fields []telemetrytypes.TelemetryFieldKey, found []bool) {
	if row == nil || len(fields) == 0 {
		return
	}
	attributes := row.Attributes()
	for k, field := range fields {
		onRow, isSpanField := span.selectSpanField(row, &field)
		if !isSpanField {
			onRow = span.selectAttribute(row, attributes, &field)
		}
		found[k] = found[k] || onRow
	}
}

// selectSpanField copies a field of the span itself from row. known is false when field does not
// name one, and found is false when the span has no value for it.
func (span *Span) selectSpanField(row *StorableSpan, field *telemetrytypes.TelemetryFieldKey) (found, known bool) {
	name := field.Name
	switch field.FieldContext {
	case telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldContextSpan:
	case telemetrytypes.FieldContextScope:
		name = "scope." + name
	default:
		return false, false
	}

	switch name {
	case "span_id", "trace_id", "parent_span_id", "name", "kind_string", "timestamp", "duration_nano",
		"has_error", "status_code_string", "status_message", "response_status_code":
		// Every span already carries these.
		return true, true
	case "http_method":
		return setString(&span.HTTPMethod, row.HTTPMethod), true
	case "http_url":
		return setString(&span.HTTPURL, row.HTTPURL), true
	case "http_host":
		return setString(&span.HTTPHost, row.HTTPHost), true
	case "external_http_method":
		return setString(&span.ExternalHTTPMethod, row.ExternalHTTPMethod), true
	case "external_http_url":
		return setString(&span.ExternalHTTPURL, row.ExternalHTTPURL), true
	case "db_name":
		return setString(&span.DBName, row.DBName), true
	case "db_operation":
		return setString(&span.DBOperation, row.DBOperation), true
	case "trace_state":
		return setString(&span.TraceState, row.TraceState), true
	case "scope.name", "scope.version":
		selected := NewSelectedScope(row.Scope.Flatten(), []string{name})
		if len(selected) == 0 {
			return false, true
		}
		if span.Scope == nil {
			span.Scope = Scope{}
		}
		maps.Copy(span.Scope, selected)
		return true, true
	}
	return false, false
}

// selectAttribute copies an attribute or a resource attribute from row, and reports whether row
// has it. A name without a context is looked up in both.
func (span *Span) selectAttribute(row *StorableSpan, attributes map[string]any, field *telemetrytypes.TelemetryFieldKey) bool {
	found := false
	switch field.FieldContext {
	case telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldContextResource:
		if value, ok := row.ResourcesString[field.Name]; ok {
			span.Resource[field.Name], found = value, true
		}
	}
	switch field.FieldContext {
	case telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextSpan:
		if value, ok := attributes[field.Name]; ok {
			span.Attributes[field.Name], found = value, true
		}
	}
	// The context word can be part of an attribute name, as in an attribute named resource.type.
	if text := telemetrytypes.TelemetryFieldKeyToText(field); !found {
		if value, ok := attributes[text]; ok {
			span.Attributes[text], found = value, true
		}
	}
	return found
}

func setString(target *string, value string) bool {
	*target = value
	return value != ""
}

// findWords returns up to three places in the span where one of the words occurs, ignoring case.
func findWords(row *StorableSpan, words []string) []SpanTextMatch {
	if row == nil || len(words) == 0 {
		return nil
	}
	found := make([]SpanTextMatch, 0)
	// check notes the first of texts that holds a word, and reports whether enough places were found.
	check := func(field string, texts ...string) bool {
		for _, text := range texts {
			for _, word := range words {
				if snippet, ok := snippetAround(text, word); ok {
					found = append(found, SpanTextMatch{Field: field, Snippet: snippet})
					return len(found) == spanMatchLimit
				}
			}
		}
		return false
	}

	if check("name", row.Name) || check("status_message", row.StatusMessage) {
		return found
	}
	attributes := row.Attributes()
	for _, key := range slices.Sorted(maps.Keys(attributes)) {
		if check("attributes."+key, attributeText(attributes[key]), key) {
			return found
		}
	}
	for _, key := range slices.Sorted(maps.Keys(row.ResourcesString)) {
		if check("resource."+key, row.ResourcesString[key], key) {
			return found
		}
	}
	for index, event := range row.UnmarshalledEvents() {
		texts := []string{event.Name}
		for _, key := range slices.Sorted(maps.Keys(event.AttributeMap)) {
			texts = append(texts, attributeText(event.AttributeMap[key]), key)
		}
		if check(fmt.Sprintf("events[%d]", index), texts...) {
			return found
		}
	}
	return found
}

// attributeText writes a number in plain digits, as the store does when it matches a word:
// fmt writes 1234567 as 1.234567e+06.
func attributeText(value any) string {
	if number, ok := value.(float64); ok {
		return strconv.FormatFloat(number, 'f', -1, 64)
	}
	return fmt.Sprint(value)
}

// snippetAround returns the text around the first place word occurs in value, ignoring case.
func snippetAround(value, word string) (string, bool) {
	// Lowering can change the byte length of some characters; positions then no longer map back.
	lowered := strings.ToLower(value)
	if len(lowered) != len(value) {
		lowered = value
	}
	at := strings.Index(lowered, strings.ToLower(word))
	if at < 0 {
		return "", false
	}
	start := max(at-spanMatchSnippetRadius, 0)
	end := min(at+len(word)+spanMatchSnippetRadius, len(value))
	for start > 0 && !utf8.RuneStart(value[start]) {
		start--
	}
	for end < len(value) && !utf8.RuneStart(value[end]) {
		end++
	}
	snippet := value[start:end]
	if start > 0 {
		snippet = snippetMark + snippet
	}
	if end < len(value) {
		snippet += snippetMark
	}
	return snippet, true
}

func pageLimit(name string, value, fallback int) (int, error) {
	switch {
	case value < 0 || value > spanListMaxLimit:
		return 0, errors.NewInvalidInputf(ErrCodeTraceSpansInvalidLimit, "%s must be between 1 and %d, got %d", name, spanListMaxLimit, value)
	case value == 0:
		return fallback, nil
	}
	return value, nil
}

// page cuts one page out of the spans of scope. A view keeps the ones of its kind, in its own order.
func (skeleton *TraceSkeleton) page(scope []int32, view SpanListView, offset, limit int) *SpanListPage {
	positions := scope
	if view != "" {
		positions = skeleton.viewPositions(view, scope)
	}
	page := &SpanListPage{skeleton: skeleton, view: view, total: uint64(len(positions))}
	if offset < len(positions) {
		page.positions = positions[offset:min(offset+limit, len(positions))]
	}
	return page
}

// scopePositions lists the spans a scope covers, in the scope's own order.
func (skeleton *TraceSkeleton) scopePositions(scope SpanScope, spanID string) ([]int32, error) {
	if scope == SpanScopeTrace {
		return skeleton.treeOrder, nil
	}
	span, ok := skeleton.position(spanID)
	if !ok {
		return nil, errors.NewNotFoundf(ErrCodeTraceSpanNotFound, "span %s not found in trace %s", spanID, skeleton.traceID)
	}
	switch scope {
	case SpanScopeChildren:
		return skeleton.children(span), nil
	case SpanScopeDescendants:
		// The spans below a span follow it directly in tree order.
		at := slices.Index(skeleton.treeOrder, span)
		return skeleton.treeOrder[at+1 : at+1+int(skeleton.descendantCount[span])], nil
	case SpanScopeAncestors:
		ancestors := make([]int32, 0, skeleton.level[span])
		for parent := skeleton.parents[span]; parent != noParent; parent = skeleton.parents[parent] {
			ancestors = append(ancestors, parent)
		}
		return ancestors, nil
	}
	return nil, errors.NewInternalf(errors.CodeInternal, "unknown span scope %q", string(scope))
}

// spansAmong keeps the spans of scope whose id is one of spanIDs, in the order of scope.
func (skeleton *TraceSkeleton) spansAmong(scope []int32, spanIDs []string) []int32 {
	wanted := make(map[string]struct{}, len(spanIDs))
	for _, spanID := range spanIDs {
		wanted[spanID] = struct{}{}
	}
	spans := make([]int32, 0, min(len(scope), len(spanIDs)))
	for _, i := range scope {
		if _, ok := wanted[skeleton.spanID(i)]; ok {
			spans = append(spans, i)
		}
	}
	return spans
}

// viewPositions lists the spans of scope that are in a view, in the order of the view.
func (skeleton *TraceSkeleton) viewPositions(view SpanListView, scope []int32) []int32 {
	switch view {
	case SpanListViewErrorOrigins:
		return skeleton.spansWhere(scope, skeleton.errorStartsAt)
	case SpanListViewUnmarkedFailures:
		return skeleton.spansWhere(scope, func(i int32) bool { return skeleton.unmarkedFailureKind(i) != "" })
	case SpanListViewLinks:
		return skeleton.spansWhere(scope, func(i int32) bool { return skeleton.hasLink[i] })
	case SpanListViewTimeSpent:
		return skeleton.timeSpentSpans(scope)
	case SpanListViewAIUsage:
		return skeleton.aiUsageSpans(scope)
	}
	return nil
}

// errorStartsAt reports whether span i is an error span with no error span among its children.
func (skeleton *TraceSkeleton) errorStartsAt(i int32) bool {
	return skeleton.hasError[i] && !slices.ContainsFunc(skeleton.children(i), func(child int32) bool { return skeleton.hasError[child] })
}

// spansWhere lists the spans of scope that match, in start time order.
func (skeleton *TraceSkeleton) spansWhere(scope []int32, match func(i int32) bool) []int32 {
	spans := make([]int32, 0)
	for _, i := range scope {
		if match(i) {
			spans = append(spans, i)
		}
	}
	slices.Sort(spans)
	return spans
}

// timeSpentSpans lists one span for each sibling group in scope, its longest there, the group with
// the most own time first. Equal groups fall back to span order, so that every page cuts the same ranking.
func (skeleton *TraceSkeleton) timeSpentSpans(scope []int32) []int32 {
	longest := slices.Repeat([]int32{-1}, len(skeleton.groups))
	for _, i := range scope {
		group := skeleton.groupOf[i]
		if longest[group] < 0 || skeleton.durationNano[i] > skeleton.durationNano[longest[group]] {
			longest[group] = i
		}
	}
	spans := slices.DeleteFunc(longest, func(i int32) bool { return i < 0 })
	groupOwnTime := func(i int32) uint64 { return skeleton.groups[skeleton.groupOf[i]].ownTime }
	slices.SortFunc(spans, func(a, b int32) int {
		return cmp.Or(cmp.Compare(groupOwnTime(b), groupOwnTime(a)), cmp.Compare(a, b))
	})
	return spans
}

// aiUsageSpans lists the spans of scope that carry gen_ai usage by cost, or by tokens when none
// of them carries a cost; equal spans fall back to span order.
func (skeleton *TraceSkeleton) aiUsageSpans(scope []int32) []int32 {
	spans := skeleton.spansWhere(scope, func(i int32) bool {
		_, ok := skeleton.aiUsage[i]
		return ok
	})
	hasCost := slices.ContainsFunc(spans, func(i int32) bool { return skeleton.aiUsage[i].Cost != nil })
	weight := func(i int32) float64 {
		usage := skeleton.aiUsage[i]
		if hasCost {
			return floatValue(usage.Cost)
		}
		return floatValue(usage.InputTokens) + floatValue(usage.OutputTokens)
	}
	slices.SortFunc(spans, func(a, b int32) int {
		return cmp.Or(cmp.Compare(weight(b), weight(a)), cmp.Compare(a, b))
	})
	return spans
}

// span returns span i with service.name as its only resource attribute.
func (skeleton *TraceSkeleton) span(i int32) Span {
	return Span{
		SpanID:             skeleton.spanID(i),
		TraceID:            skeleton.traceID,
		ParentSpanID:       skeleton.parentSpanID(i),
		Name:               skeleton.stringTable[skeleton.names[i]],
		KindString:         skeleton.stringTable[skeleton.kinds[i]],
		TimeUnix:           uint64(skeleton.startNano[i] / 1_000_000),
		DurationNano:       skeleton.durationNano[i],
		HasError:           skeleton.hasError[i],
		StatusCodeString:   skeleton.stringTable[skeleton.statusCodeStrings[i]],
		StatusMessage:      skeleton.stringTable[skeleton.statusMessages[i]],
		ResponseStatusCode: skeleton.stringTable[skeleton.responseStatusCodes[i]],
		Resource:           map[string]string{"service.name": skeleton.stringTable[skeleton.services[i]]},
		Attributes:         map[string]any{},
		Events:             []Event{},
		References:         skeleton.spanReferences(i),
	}
}

func (skeleton *TraceSkeleton) setUsageAttributes(span *Span, i int32) {
	usage := skeleton.aiUsage[i]
	for key, value := range map[string]*float64{
		aiobservabilitytypes.GenAIUsageInputTokens:              usage.InputTokens,
		aiobservabilitytypes.GenAIUsageOutputTokens:             usage.OutputTokens,
		aiobservabilitytypes.GenAIUsageCacheReadInputTokens:     usage.CacheReadTokens,
		aiobservabilitytypes.GenAIUsageCacheCreationInputTokens: usage.CacheWriteTokens,
		aiobservabilitytypes.GenAIUsageReasoningOutputTokens:    usage.ReasoningTokens,
		aiobservabilitytypes.SignozGenAITotalCost:               usage.Cost,
	} {
		if value != nil {
			span.Attributes[key] = *value
		}
	}
}

func floatValue(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}
