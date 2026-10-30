package querybuilder

import (
	"context"
	"fmt"
	"math"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// heatmapBucketValueAlias names the value a heatmap's bounds are cut from. The
// bounds read it several times, so it is declared once as a WITH expression
// alias rather than repeated.
const heatmapBucketValueAlias = "__bucket_value"

// RenderHeatmapBucketExprs renders the bucket (min, max] that valueExpr falls
// in. Only the bucket under everything the axis covers is open below, and only
// the one over it is open above.
//
// valueExpr is repeated several times in each expression, so it has to be free
// of placeholders — HeatmapBucketColumns passes an alias for that reason.
func RenderHeatmapBucketExprs(bucketing qbtypes.HeatmapBucketing, valueExpr string) (minExpr, maxExpr string, err error) {
	switch bucketing.Kind {
	case qbtypes.BucketsKindLinear:
		return renderLinearBucketExprs(bucketing, valueExpr)
	case qbtypes.BucketsKindLog:
		return renderLogBucketExprs(valueExpr)
	default:
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"invalid bucketOptions kind: %s", bucketing.Kind.StringValue())
	}
}

func renderLinearBucketExprs(bucketing qbtypes.HeatmapBucketing, valueExpr string) (string, string, error) {
	maxValue := FormatHeatmapFloat(bucketing.MaxValue)
	numBuckets := strconv.Itoa(bucketing.NumBuckets)
	index := fmt.Sprintf("least(greatest(ceil(%s * %s / %s), 1), %s)", valueExpr, numBuckets, maxValue, numBuckets)

	minExpr := fmt.Sprintf(
		"multiIf(%s, NULL, %s <= 0, toFloat64('-Inf'), %s > %s, toFloat64(%s), (%s - 1) * %s / %s)",
		absentValue(valueExpr), valueExpr, valueExpr, maxValue, maxValue, index, maxValue, numBuckets,
	)
	maxExpr := fmt.Sprintf(
		"multiIf(%s, NULL, %s <= 0, toFloat64(0), %s > %s, toFloat64('+Inf'), %s * %s / %s)",
		absentValue(valueExpr), valueExpr, valueExpr, maxValue, index, maxValue, numBuckets,
	)
	return minExpr, maxExpr, nil
}

// ClickHouse buckets at MaxLogScale whatever HeatmapBucketing.LogScale asks for;
// postprocessing folds the axis down afterwards.
func renderLogBucketExprs(valueExpr string) (string, string, error) {
	bucketsPerDoubling := FormatHeatmapFloat(math.Exp2(qbtypes.MaxLogScale))
	lowest := FormatHeatmapFloat(qbtypes.MinLogUpperBound)
	highest := FormatHeatmapFloat(qbtypes.MaxLogUpperBound)

	minExpr := fmt.Sprintf(
		"multiIf(%s, NULL, %s <= 0, toFloat64('-Inf'), %s <= %s, toFloat64(0), %s > %s, toFloat64(%s), pow(2, (ceil(log2(%s) * %s) - 1) / %s))",
		absentValue(valueExpr), valueExpr, valueExpr, lowest, valueExpr, highest, highest, valueExpr, bucketsPerDoubling, bucketsPerDoubling,
	)
	maxExpr := fmt.Sprintf(
		"multiIf(%s, NULL, %s <= 0, toFloat64(0), %s <= %s, %s, %s > %s, toFloat64('+Inf'), pow(2, ceil(log2(%s) * %s) / %s))",
		absentValue(valueExpr), valueExpr, valueExpr, lowest, lowest, valueExpr, highest, valueExpr, bucketsPerDoubling, bucketsPerDoubling,
	)
	return minExpr, maxExpr, nil
}

// absentValue tests for a row the axis has no place for. A log or a span need
// not carry the bucketed field at all, and without this the comparisons below
// read a missing value as the smallest one: greatest(NULL, 1) is 1 in
// ClickHouse, so an absent value would be counted in the lowest bucket. A NULL
// bound instead leaves the row with no bucket, and the reader drops it.
func absentValue(valueExpr string) string {
	return fmt.Sprintf("isNull(%s)", valueExpr)
}

// FormatHeatmapFloat renders a float64 as the shortest literal that reads back
// as the same value, so an upper bound computed from it is identical on every
// row.
func FormatHeatmapFloat(v float64) string {
	return strconv.FormatFloat(v, 'g', -1, 64)
}

// HeatmapBucketColumns adds the bucket a row's value falls in to sb's select
// list, as the (min, max] pair a heatmap statement reports. key is the field
// the axis is cut from, already adjusted for context and data type.
//
// The bounds read the value through an expression alias rather than repeating
// it, so the returned fragment has to be declared alongside the caller's CTEs.
// It carries no arguments of its own.
func HeatmapBucketColumns(
	ctx context.Context,
	info qbtypes.QueryInfo,
	storage qbtypes.Storage,
	sb *sqlbuilder.SelectBuilder,
	key *telemetrytypes.TelemetryFieldKey,
	bucketOptions *qbtypes.BucketOptions,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (valueFragment string, groupByAliases []string, warnings []string, err error) {
	// Resolved directly rather than through ResolveColumn: a row whose value is
	// absent has no bucket and drops out, so a key nothing carries draws an empty
	// heatmap, and the warning is the only thing that says why.
	resolved, err := Resolve(ctx, info, storage, key, qbtypes.FilterOperatorUnknown, nil, keys)
	if err != nil {
		return "", nil, nil, err
	}
	valueExpr, err := Column(ctx, info, storage, resolved, telemetrytypes.FieldDataTypeFloat64)
	if err != nil {
		return "", nil, nil, err
	}

	bucketMin, bucketMax, err := RenderHeatmapBucketExprs(bucketOptions.ToHeatmapBucketing(), heatmapBucketValueAlias)
	if err != nil {
		return "", nil, nil, err
	}

	sb.SelectMore(sqlbuilder.Escape(fmt.Sprintf("%s AS %s", bucketMin, qbtypes.HeatmapBucketMinColumn)))
	sb.SelectMore(sqlbuilder.Escape(fmt.Sprintf("%s AS %s", bucketMax, qbtypes.HeatmapBucketMaxColumn)))

	valueFragment = sqlbuilder.Escape(fmt.Sprintf("%s AS %s", valueExpr, heatmapBucketValueAlias))
	return valueFragment, []string{qbtypes.HeatmapBucketMinColumn, qbtypes.HeatmapBucketMaxColumn}, resolved.Warnings, nil
}
