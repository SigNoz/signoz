package telemetrymetadata

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/sync/semaphore"
)

// relatedValuesWindow returns the window of the related-values query. The
// requested window is clamped to maxWindow (an unset start becomes end minus
// maxWindow, an unset end becomes now) and the start is floored to the bucket
// that holds it. truncated reports that the clamp moved the start, so the
// result covers less than the request asked for.
func relatedValuesWindow(startMs, endMs int64, now time.Time, maxWindow time.Duration, bucketMs int64) (int64, int64, bool) {
	if endMs == 0 {
		endMs = now.UnixMilli()
	}
	truncated := false
	if maxWindow > 0 && (startMs == 0 || endMs-startMs > maxWindow.Milliseconds()) {
		startMs = endMs - maxWindow.Milliseconds()
		truncated = true
	}
	if bucketMs > 0 {
		startMs -= startMs % bucketMs
	}
	return startMs, endMs, truncated
}

// relatedTarget is where the requested key was found: the metadata contexts
// it resolves to and the signals it was seen in.
type relatedTarget struct {
	contexts []telemetrytypes.FieldContext
	signals  map[telemetrytypes.Signal]struct{}
}

func metadataContextFor(fieldContext telemetrytypes.FieldContext) (telemetrytypes.FieldContext, bool) {
	switch fieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute,
		telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextLog:
		return fieldContext, true
	}
	return telemetrytypes.FieldContextUnspecified, false
}

// resolveRelatedTarget derives the target from the requested context when one
// is given, otherwise from the keys the lookup returned for the name.
func resolveRelatedTarget(selector *telemetrytypes.FieldValueSelector, keys []*telemetrytypes.TelemetryFieldKey) relatedTarget {
	target := relatedTarget{signals: map[telemetrytypes.Signal]struct{}{}}
	if fieldContext, ok := metadataContextFor(selector.FieldContext); ok {
		target.contexts = []telemetrytypes.FieldContext{fieldContext}
	}
	seen := map[telemetrytypes.FieldContext]struct{}{}
	for _, key := range keys {
		fieldContext, ok := metadataContextFor(key.FieldContext)
		if !ok {
			continue
		}
		if selector.FieldContext != telemetrytypes.FieldContextUnspecified && fieldContext != selector.FieldContext {
			continue
		}
		if key.Signal != telemetrytypes.SignalUnspecified {
			target.signals[key.Signal] = struct{}{}
		}
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified {
			if _, added := seen[fieldContext]; !added {
				seen[fieldContext] = struct{}{}
				target.contexts = append(target.contexts, fieldContext)
			}
		}
	}
	return target
}

// relatedValuesContexts returns the maps the key is read from and searched
// in: the maps it resolved to, or all three when nothing is known about it.
// The span name is also read from attributes for rows written before the
// intrinsic map existed.
func relatedValuesContexts(name string, target relatedTarget) []telemetrytypes.FieldContext {
	contexts := target.contexts
	if len(contexts) == 0 {
		return []telemetrytypes.FieldContext{telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute}
	}
	if name == "name" && len(contexts) == 1 && (contexts[0] == telemetrytypes.FieldContextSpan || contexts[0] == telemetrytypes.FieldContextLog) {
		return append([]telemetrytypes.FieldContext{contexts[0]}, telemetrytypes.FieldContextAttribute)
	}
	return contexts
}

// relatedValuesSelectColumn returns the expression that reads the key from
// the metadata table: the single map it is read from, or a multiIf over
// several.
func (t *telemetryMetaStore) relatedValuesSelectColumn(ctx context.Context, orgID valuer.UUID, name string, target relatedTarget) string {
	fieldFor := func(fieldContext telemetrytypes.FieldContext) string {
		column, _ := t.fm.FieldFor(ctx, orgID, 0, 0, &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			FieldContext:  fieldContext,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		return column
	}

	contexts := relatedValuesContexts(name, target)
	if len(contexts) == 1 {
		return fieldFor(contexts[0])
	}
	args := []string{}
	for _, fieldContext := range contexts[:len(contexts)-1] {
		column := fieldFor(fieldContext)
		args = append(args, fmt.Sprintf("notEmpty(%s), %s", column, column))
	}
	args = append(args, fieldFor(contexts[len(contexts)-1]))
	return fmt.Sprintf("multiIf(%s)", strings.Join(args, ", "))
}

// relatedValuesSignal picks the data source to scan for a request without a
// signal: the one signal the key was seen in. A key seen in several signals
// keeps scanning all of them, since the values of one signal need not cover
// the others.
func relatedValuesSignal(requested telemetrytypes.Signal, target relatedTarget) telemetrytypes.Signal {
	if requested != telemetrytypes.SignalUnspecified {
		return requested
	}
	if len(target.signals) == 1 {
		for signal := range target.signals {
			return signal
		}
	}
	return telemetrytypes.SignalUnspecified
}

// relatedValuesQueryContext applies the related-values bounds to the queries
// run with the context: the execution time, checked from the start, the
// thread count and the read buffer. With partialOnTimeout the values found by
// the bound are returned; without it the query fails on the bound.
func (t *telemetryMetaStore) relatedValuesQueryContext(ctx context.Context, partialOnTimeout bool) context.Context {
	cfg := t.config.RelatedValues
	settings := map[string]any{}
	if cfg.MaxExecutionTime > 0 {
		settings["max_execution_time"] = cfg.MaxExecutionTime.Seconds()
		settings["timeout_before_checking_execution_speed"] = 0
		if partialOnTimeout {
			settings["timeout_overflow_mode"] = "break"
		}
	}
	if cfg.MaxThreads > 0 {
		settings["max_threads"] = cfg.MaxThreads
	}
	if cfg.ReadBufferSize > 0 {
		settings["max_read_buffer_size_local_fs"] = cfg.ReadBufferSize
	}
	return ctxtypes.SetClickhouseSettings(ctx, settings)
}

// relatedValuesFilterAbsent reports whether an equality term of the existing
// query names a value the key does not have in the window, in which case no
// row can match and the scan is skipped. Only conjunctions of traces or logs
// filters on resource or attribute keys are checked, up to the configured
// number of terms.
func (t *telemetryMetaStore) relatedValuesFilterAbsent(ctx context.Context, orgID valuer.UUID, selector *telemetrytypes.FieldValueSelector, signal telemetrytypes.Signal, keys map[string][]*telemetrytypes.TelemetryFieldKey, startMs, endMs int64) bool {
	maxChecks := t.config.RelatedValues.MaxExistenceChecks
	if maxChecks <= 0 || (signal != telemetrytypes.SignalTraces && signal != telemetrytypes.SignalLogs) {
		return false
	}
	terms, ok := querybuilder.QueryStringEqualityTerms(selector.ExistingQuery)
	if !ok {
		return false
	}
	checked := 0
	for _, term := range terms {
		if checked >= maxChecks {
			break
		}
		fieldContext, ok := t.singleMapContext(term.Key, keys[term.Key.Name], signal)
		if !ok {
			continue
		}
		checked++
		// the check fails on the time bound instead of returning a partial
		// result, and a failed check proves nothing
		exists, err := t.tagValueExists(t.relatedValuesQueryContext(ctx, false), signal, term.Key.Name, fieldContext, term.Value, startMs)
		if err != nil {
			t.logger.DebugContext(ctx, "failed to check filter value existence", slog.String("key", term.Key.Name), errors.Attr(err))
			continue
		}
		if !exists {
			t.logger.DebugContext(ctx, "related values skipped: filter value absent in window", slog.String("key", term.Key.Name), slog.String("value", term.Value))
			return true
		}
	}
	return false
}

// tagValueExists reports whether the tag table of the signal holds the value
// for the key, as a string or as the number it parses to, since the window
// start.
func (t *telemetryMetaStore) tagValueExists(ctx context.Context, signal telemetrytypes.Signal, name string, fieldContext telemetrytypes.FieldContext, value string, startMs int64) (bool, error) {
	var table string
	switch signal {
	case telemetrytypes.SignalTraces:
		table = t.tracesDBName + "." + t.tracesFieldsTblName
	case telemetrytypes.SignalLogs:
		table = t.logsDBName + "." + t.logsFieldsTblName
	default:
		return true, nil
	}

	sb := sqlbuilder.Select("1").From(table)
	sb.Where(sb.E("tag_key", name))
	sb.Where(sb.E("tag_type", fieldContext.TagType()))
	valueConds := []string{sb.E("string_value", value)}
	if number, err := strconv.ParseFloat(value, 64); err == nil {
		valueConds = append(valueConds, sb.E("number_value", number))
	}
	sb.Where(sb.Or(valueConds...))
	if startMs > 0 {
		sb.Where(sb.GE("unix_milli", startMs))
	}
	sb.Limit(1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	exists := rows.Next()
	return exists, rows.Err()
}

// singleMapContext returns the resource or attribute context a filter key
// resolves to in the signal, when it resolves to exactly one.
func (t *telemetryMetaStore) singleMapContext(key *telemetrytypes.TelemetryFieldKey, resolved []*telemetrytypes.TelemetryFieldKey, signal telemetrytypes.Signal) (telemetrytypes.FieldContext, bool) {
	if key.FieldContext == telemetrytypes.FieldContextResource || key.FieldContext == telemetrytypes.FieldContextAttribute {
		return key.FieldContext, true
	}
	if key.FieldContext != telemetrytypes.FieldContextUnspecified {
		return telemetrytypes.FieldContextUnspecified, false
	}
	found := telemetrytypes.FieldContextUnspecified
	for _, candidate := range resolved {
		if candidate.Signal != signal {
			continue
		}
		if candidate.FieldContext != telemetrytypes.FieldContextResource && candidate.FieldContext != telemetrytypes.FieldContextAttribute {
			return telemetrytypes.FieldContextUnspecified, false
		}
		if found != telemetrytypes.FieldContextUnspecified && found != candidate.FieldContext {
			return telemetrytypes.FieldContextUnspecified, false
		}
		found = candidate.FieldContext
	}
	return found, found != telemetrytypes.FieldContextUnspecified
}

// relatedValuesSlot returns the org's concurrency limiter for related-values
// queries, or nil when no limit is configured.
func (t *telemetryMetaStore) relatedValuesSlot(orgID valuer.UUID) *semaphore.Weighted {
	limit := t.config.RelatedValues.MaxConcurrency
	if limit <= 0 {
		return nil
	}
	t.relatedSlotsMu.Lock()
	defer t.relatedSlotsMu.Unlock()
	slot, ok := t.relatedSlots[orgID]
	if !ok {
		slot = semaphore.NewWeighted(int64(limit))
		t.relatedSlots[orgID] = slot
	}
	return slot
}
