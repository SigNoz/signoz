package querybuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

// NewQueryInfo binds the context of one query and evaluates the query-path
// flags one time. A nil flagger keeps resolution literal and the log body in
// its legacy column.
func NewQueryInfo(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, signal telemetrytypes.Signal, metric *telemetrytypes.MetricContext, startNs, endNs uint64) qbtypes.QueryInfo {
	q := qbtypes.QueryInfo{
		OrgID:      orgID,
		StartNs:    startNs,
		EndNs:      endNs,
		Signal:     signal,
		Metric:     metric,
		FamiliesOn: semconvFamiliesEnabled(ctx, orgID, fl),
	}
	if fl != nil {
		q.BodyJSONOn = fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))
	}
	return q
}

// Resolve turns one requested key into its meanings, one time per stage
// entry. The order is the same for every storage and every stage:
//
//  1. matches: the metadata keys under the key's spellings, grouped into
//     families when the flag is on; a key under one of the storage's own
//     contexts matches as if it had none;
//  2. ambiguity: in a filter, several interpretations settle by the
//     resource-over-attribute policy, with a warning; a column stage keeps
//     every interpretation in metadata order and folds them;
//  3. intrinsic column first: for a bare key, a column every row has leads, whether
//     metadata reports it or the storage's own tables do, and sentinel
//     fields of a contradicting type drop;
//  4. fallback: with no match, the storage's fallback keys; the not-found
//     warning fires only when every one of them is a guess.
func Resolve(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
) (qbtypes.Resolved, error) {
	traits := storage.Traits()

	lookup := key
	for _, own := range traits.OwnContexts {
		if key.FieldContext == own {
			bare := *key
			bare.FieldContext = telemetrytypes.FieldContextUnspecified
			lookup = &bare
			break
		}
	}
	matches := matchingLogicalFields(q.FamiliesOn, q.Signal, lookup, fieldKeys)

	resolved := qbtypes.Resolved{Key: key, Ambiguous: len(matches) > 1}
	fields := matches
	if operator != qbtypes.FilterOperatorUnknown {
		var warning string
		fields, warning = ResolveLogicalFields(key, matches)
		if warning != "" {
			resolved.Warnings = append(resolved.Warnings, warning)
		}
	}
	if lookup.FieldContext == telemetrytypes.FieldContextUnspecified && len(fields) > 0 {
		var err error
		fields, err = intrinsicColumnFirst(ctx, q, storage, key, operator, value, fields)
		if err != nil {
			return qbtypes.Resolved{}, err
		}
	}
	if len(fields) > 0 {
		resolved.Fields = fields
		return resolved, nil
	}

	fallback, err := storage.Fallback(ctx, q, key, operator, value)
	if err != nil {
		return qbtypes.Resolved{}, err
	}
	if len(fallback) == 0 {
		if traits.UnknownKey == qbtypes.IgnoreUnknownKey {
			resolved.Skipped = true
			return resolved, nil
		}
		return qbtypes.Resolved{}, NewKeyNotFoundError(key.Name, maps.Keys(fieldKeys))
	}
	resolved.FromFallback = true
	resolved.Fields = fallback
	if fallbackIsGuess(ctx, q, storage, fallback) {
		resolved.Warnings = append(resolved.Warnings, NewKeyNotFoundWarning(key.Name))
	}
	return resolved, nil
}

// ResolveColumn resolves one key for a column stage and renders it.
func ResolveColumn(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	key *telemetrytypes.TelemetryFieldKey,
	target telemetrytypes.FieldDataType,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	resolved, err := Resolve(ctx, q, storage, key, qbtypes.FilterOperatorUnknown, nil, fieldKeys)
	if err != nil {
		return "", err
	}
	return Column(ctx, q, storage, resolved, target)
}

// intrinsicColumnFirst applies rule 3 to a bare key. The column comes from the
// matches when metadata reports it, else from the storage's own fallback,
// so a metadata gap degrades to the correct column and never to a corrupt
// metadata key. A match of a contradicting data type drops.
func intrinsicColumnFirst(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	fields []*telemetrytypes.LogicalField,
) ([]*telemetrytypes.LogicalField, error) {
	column := alwaysPresent(ctx, q, storage, fields)
	if column == nil {
		// a fallback that cannot answer this term has no column for it; its
		// error belongs to the no-match path
		if fallback, err := storage.Fallback(ctx, q, key, operator, value); err == nil {
			column = alwaysPresent(ctx, q, storage, fallback)
		}
	}
	if column == nil {
		return fields, nil
	}
	out := make([]*telemetrytypes.LogicalField, 0, len(fields)+1)
	out = append(out, column)
	for _, logical := range fields {
		if logical == column || sameFact(logical, column) {
			continue
		}
		if dataTypesConsistent(column.FieldDataType, logical.FieldDataType) {
			out = append(out, logical)
		}
	}
	return out, nil
}

// alwaysPresent returns the first field every row has. A field the storage
// cannot test for presence is not that field.
func alwaysPresent(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, fields []*telemetrytypes.LogicalField) *telemetrytypes.LogicalField {
	for _, logical := range fields {
		if logical.IsFamily() {
			continue
		}
		existence, err := storage.Exists(ctx, q, logical.Single(), true)
		if err == nil && existence.WhenAbsent == qbtypes.AlwaysPresent {
			return logical
		}
	}
	return nil
}

func sameFact(a, b *telemetrytypes.LogicalField) bool {
	return !a.IsFamily() && !b.IsFamily() &&
		a.FieldContext == b.FieldContext && a.Single().Name == b.Single().Name
}

// dataTypesConsistent reports whether a metadata key's data type can
// describe the same stored value as the column's: an unspecified type
// matches anything, and the numeric kinds match each other.
func dataTypesConsistent(column, entry telemetrytypes.FieldDataType) bool {
	if column == telemetrytypes.FieldDataTypeUnspecified || entry == telemetrytypes.FieldDataTypeUnspecified {
		return true
	}
	if column == entry {
		return true
	}
	return isNumber(column) && isNumber(entry)
}

func isNumber(dt telemetrytypes.FieldDataType) bool {
	return dt == telemetrytypes.FieldDataTypeInt64 || dt == telemetrytypes.FieldDataTypeFloat64 || dt == telemetrytypes.FieldDataTypeNumber
}

// fallbackIsGuess reports whether every fallback key is a guess. A column
// the storage knows is not one, and its presence means the key was found.
func fallbackIsGuess(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, fields []*telemetrytypes.LogicalField) bool {
	return alwaysPresent(ctx, q, storage, fields) == nil
}
