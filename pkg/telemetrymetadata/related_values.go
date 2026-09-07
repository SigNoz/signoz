package telemetrymetadata

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/semaphore"
)

// dataSourceCountsTTL is how long the per-signal row counts of the metadata
// table are cached; they only steer which signal a signal-less request scans.
const dataSourceCountsTTL = 10 * time.Minute

// relatedValuesWindow returns the window of the related-values query. The
// requested window is clamped to maxWindow (an unset start becomes end minus
// maxWindow, an unset end becomes now), then the start is floored and the end
// ceiled to the bucket so repeated requests share the same predicate.
func relatedValuesWindow(startMs, endMs int64, now time.Time, maxWindow time.Duration, bucketMs int64) (int64, int64) {
	if endMs == 0 {
		endMs = now.UnixMilli()
	}
	if maxWindow > 0 && (startMs == 0 || endMs-startMs > maxWindow.Milliseconds()) {
		startMs = endMs - maxWindow.Milliseconds()
	}
	if bucketMs > 0 {
		startMs -= startMs % bucketMs
		if rem := endMs % bucketMs; rem != 0 {
			endMs += bucketMs - rem
		}
	}
	return startMs, endMs
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

// relatedValuesSelectColumn returns the expression that reads the key from
// the metadata table: the single map the key resolved to, a multiIf over the
// maps it resolved to, or all three when nothing is known about it. The span
// name is also read from attributes for rows written before the intrinsic map
// existed.
func (t *telemetryMetaStore) relatedValuesSelectColumn(ctx context.Context, orgID valuer.UUID, name string, target relatedTarget) string {
	fieldFor := func(fieldContext telemetrytypes.FieldContext) string {
		column, _ := t.fm.FieldFor(ctx, orgID, 0, 0, &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			FieldContext:  fieldContext,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		return column
	}

	contexts := target.contexts
	if len(contexts) == 0 {
		contexts = []telemetrytypes.FieldContext{telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute}
	}
	if name == "name" && len(contexts) == 1 && (contexts[0] == telemetrytypes.FieldContextSpan || contexts[0] == telemetrytypes.FieldContextLog) {
		contexts = append(contexts, telemetrytypes.FieldContextAttribute)
	}
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
// signal: the one signal the key was seen in, or for a resource key seen in
// several signals the signal with the fewest rows, since resource values are
// shared across signals.
func (t *telemetryMetaStore) relatedValuesSignal(ctx context.Context, orgID valuer.UUID, requested telemetrytypes.Signal, target relatedTarget) telemetrytypes.Signal {
	if requested != telemetrytypes.SignalUnspecified {
		return requested
	}
	if len(target.signals) == 1 {
		for signal := range target.signals {
			return signal
		}
	}
	if len(target.signals) < 2 || len(target.contexts) != 1 || target.contexts[0] != telemetrytypes.FieldContextResource {
		return telemetrytypes.SignalUnspecified
	}
	counts, err := t.dataSourceRowCounts(ctx, orgID)
	if err != nil {
		t.logger.DebugContext(ctx, "failed to read data source row counts", errors.Attr(err))
		return telemetrytypes.SignalUnspecified
	}
	smallest := telemetrytypes.SignalUnspecified
	var smallestRows uint64
	for signal := range target.signals {
		rows, ok := counts[signal.StringValue()]
		if !ok {
			continue
		}
		if smallest == telemetrytypes.SignalUnspecified || rows < smallestRows {
			smallest, smallestRows = signal, rows
		}
	}
	return smallest
}

func (t *telemetryMetaStore) dataSourceRowCounts(ctx context.Context, orgID valuer.UUID) (map[string]uint64, error) {
	counts, err := t.countsMemo.do("datasource-counts:"+orgID.StringValue(), func() (any, error) {
		query := fmt.Sprintf("SELECT data_source, count() AS rows FROM %s.%s GROUP BY data_source", t.relatedMetadataDBName, t.relatedMetadataTblName)
		rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		counts := map[string]uint64{}
		for rows.Next() {
			var dataSource string
			var count uint64
			if err := rows.Scan(&dataSource, &count); err != nil {
				return nil, err
			}
			counts[dataSource] = count
		}
		return counts, rows.Err()
	})
	if err != nil {
		return nil, err
	}
	return counts.(map[string]uint64), nil
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
		values, _, err := t.GetAllValues(ctx, orgID, &telemetrytypes.FieldValueSelector{
			FieldKeySelector: &telemetrytypes.FieldKeySelector{
				Signal:         signal,
				Source:         selector.Source,
				Name:           term.Key.Name,
				FieldContext:   fieldContext,
				Limit:          1,
				StartUnixMilli: startMs,
				EndUnixMilli:   endMs,
			},
			Value: term.Value,
		})
		if err != nil {
			t.logger.DebugContext(ctx, "failed to check filter value existence", slog.String("key", term.Key.Name), errors.Attr(err))
			continue
		}
		if values.NumValues() == 0 {
			t.logger.DebugContext(ctx, "related values skipped: filter value absent in window", slog.String("key", term.Key.Name), slog.String("value", term.Value))
			return true
		}
	}
	return false
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
