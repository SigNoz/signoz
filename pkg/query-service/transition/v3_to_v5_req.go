package transition

import (
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"

	v5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func ConvertV3ToV5(params *v3.QueryRangeParamsV3) (*v5.QueryRangeRequest, error) {
	v3Params := params.Clone()

	if v3Params == nil || v3Params.CompositeQuery == nil {
		return nil, fmt.Errorf("v3 params or composite query is nil")
	}

	varItems := map[string]v5.VariableItem{}

	for name, value := range v3Params.Variables {
		varItems[name] = v5.VariableItem{
			Type:  v5.QueryVariableType, // doesn't matter at the moment
			Value: value,
		}
	}

	v5Request := &v5.QueryRangeRequest{
		SchemaVersion: "v5",
		Start:         uint64(v3Params.Start),
		End:           uint64(v3Params.End),
		RequestType:   convertPanelTypeToRequestType(v3Params.CompositeQuery.PanelType),
		Variables:     varItems,
		CompositeQuery: v5.CompositeQuery{
			Queries: []v5.QueryEnvelope{},
		},
		FormatOptions: &v5.FormatOptions{
			FormatTableResultForUI: v3Params.FormatForWeb,
			FillGaps:               v3Params.CompositeQuery.FillGaps,
		},
	}

	// Convert based on query type
	switch v3Params.CompositeQuery.QueryType {
	case v3.QueryTypeBuilder:
		if err := convertBuilderQueries(v3Params.CompositeQuery.BuilderQueries, &v5Request.CompositeQuery); err != nil {
			return nil, err
		}
	case v3.QueryTypeClickHouseSQL:
		if err := convertClickHouseQueries(v3Params.CompositeQuery.ClickHouseQueries, &v5Request.CompositeQuery); err != nil {
			return nil, err
		}
	case v3.QueryTypePromQL:
		if err := convertPromQueries(v3Params.CompositeQuery.PromQueries, v3Params.Step, &v5Request.CompositeQuery); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported query type: %s", v3Params.CompositeQuery.QueryType)
	}

	return v5Request, nil
}

func convertPanelTypeToRequestType(panelType v3.PanelType) v5.RequestType {
	switch panelType {
	case v3.PanelTypeValue, v3.PanelTypeTable:
		return v5.RequestTypeScalar
	case v3.PanelTypeGraph:
		return v5.RequestTypeTimeSeries
	case v3.PanelTypeList, v3.PanelTypeTrace:
		return v5.RequestTypeRaw
	default:
		return v5.RequestTypeUnknown
	}
}

func convertBuilderQueries(v3Queries map[string]*v3.BuilderQuery, v5Composite *v5.CompositeQuery) error {
	for name, query := range v3Queries {
		if query == nil {
			continue
		}

		// Handle formula queries
		if query.Expression != "" && query.Expression != name {
			v5Envelope := v5.QueryEnvelope{
				Type: v5.QueryTypeFormula,
				Spec: v5.QueryBuilderFormula{
					Name:       name,
					Expression: query.Expression,
					Disabled:   query.Disabled,
					Order:      convertOrderBy(query.OrderBy, query),
					Limit:      int(query.Limit),
					Having:     convertHaving(query.Having, query),
					Functions:  convertFunctions(query.Functions),
				},
			}
			v5Composite.Queries = append(v5Composite.Queries, v5Envelope)
			continue
		}

		// Regular builder query
		envelope, err := convertSingleBuilderQuery(name, query)
		if err != nil {
			return err
		}
		v5Composite.Queries = append(v5Composite.Queries, envelope)
	}
	return nil
}

func convertSingleBuilderQuery(name string, v3Query *v3.BuilderQuery) (v5.QueryEnvelope, error) {
	v5Envelope := v5.QueryEnvelope{
		Type: v5.QueryTypeBuilder,
	}

	switch v3Query.DataSource {
	case v3.DataSourceTraces:
		v5Query := v5.QueryBuilderQuery[v5.TraceAggregation]{
			Name:         name,
			Signal:       telemetrytypes.SignalTraces,
			Disabled:     v3Query.Disabled,
			StepInterval: v5.Step{Duration: time.Duration(v3Query.StepInterval) * time.Second},
			Filter:       convertFilter(v3Query.Filters),
			GroupBy:      convertGroupBy(v3Query.GroupBy),
			Order:        convertOrderBy(v3Query.OrderBy, v3Query),
			Limit:        int(v3Query.Limit),
			Offset:       int(v3Query.Offset),
			Having:       convertHaving(v3Query.Having, v3Query),
			Functions:    convertFunctions(v3Query.Functions),
			SelectFields: convertSelectColumns(v3Query.SelectColumns),
		}

		// Convert trace aggregations
		if v3Query.AggregateOperator != v3.AggregateOperatorNoOp {
			v5Query.Aggregations = []v5.TraceAggregation{
				{
					Expression: buildTraceAggregationExpression(v3Query),
					Alias:      "",
				},
			}
		}

		v5Envelope.Spec = v5Query

	case v3.DataSourceLogs:
		v5Query := v5.QueryBuilderQuery[v5.LogAggregation]{
			Name:         name,
			Signal:       telemetrytypes.SignalLogs,
			Disabled:     v3Query.Disabled,
			StepInterval: v5.Step{Duration: time.Duration(v3Query.StepInterval) * time.Second},
			Filter:       convertFilter(v3Query.Filters),
			GroupBy:      convertGroupBy(v3Query.GroupBy),
			Order:        convertOrderBy(v3Query.OrderBy, v3Query),
			Limit:        int(v3Query.PageSize),
			Offset:       int(v3Query.Offset),
			Having:       convertHaving(v3Query.Having, v3Query),
			Functions:    convertFunctions(v3Query.Functions),
		}

		// Convert log aggregations
		if v3Query.AggregateOperator != v3.AggregateOperatorNoOp {
			v5Query.Aggregations = []v5.LogAggregation{
				{
					Expression: buildLogAggregationExpression(v3Query),
					Alias:      "",
				},
			}
		}

		v5Envelope.Spec = v5Query

	case v3.DataSourceMetrics:
		v5Query := v5.QueryBuilderQuery[v5.MetricAggregation]{
			Name:         name,
			Signal:       telemetrytypes.SignalMetrics,
			Disabled:     v3Query.Disabled,
			StepInterval: v5.Step{Duration: time.Duration(v3Query.StepInterval) * time.Second},
			Filter:       convertFilter(v3Query.Filters),
			GroupBy:      convertGroupBy(v3Query.GroupBy),
			Order:        convertOrderBy(v3Query.OrderBy, v3Query),
			Limit:        int(v3Query.Limit),
			Offset:       int(v3Query.Offset),
			Having:       convertHaving(v3Query.Having, v3Query),
			Functions:    convertFunctions(v3Query.Functions),
		}

		if v3Query.AggregateAttribute.Key != "" {
			v5Query.Aggregations = []v5.MetricAggregation{
				{
					MetricName:       v3Query.AggregateAttribute.Key,
					Temporality:      convertTemporality(v3Query.Temporality),
					TimeAggregation:  convertTimeAggregation(v3Query.TimeAggregation),
					SpaceAggregation: convertSpaceAggregation(v3Query.SpaceAggregation),
				},
			}
		}

		v5Envelope.Spec = v5Query

	default:
		return v5Envelope, fmt.Errorf("unsupported data source: %s", v3Query.DataSource)
	}

	return v5Envelope, nil
}

func buildTraceAggregationExpression(v3Query *v3.BuilderQuery) string {
	switch v3Query.AggregateOperator {
	case v3.AggregateOperatorCount:
		if v3Query.AggregateAttribute.Key != "" {
			return fmt.Sprintf("count(%s)", v3Query.AggregateAttribute.Key)
		}
		return "count()"
	case v3.AggregateOperatorCountDistinct:
		if v3Query.AggregateAttribute.Key != "" {
			return fmt.Sprintf("countDistinct(%s)", v3Query.AggregateAttribute.Key)
		}
		return "countDistinct()"
	case v3.AggregateOperatorSum:
		return fmt.Sprintf("sum(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorAvg:
		return fmt.Sprintf("avg(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorMin:
		return fmt.Sprintf("min(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorMax:
		return fmt.Sprintf("max(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP05:
		return fmt.Sprintf("p05(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP10:
		return fmt.Sprintf("p10(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP20:
		return fmt.Sprintf("p20(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP25:
		return fmt.Sprintf("p25(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP50:
		return fmt.Sprintf("p50(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP75:
		return fmt.Sprintf("p75(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP90:
		return fmt.Sprintf("p90(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP95:
		return fmt.Sprintf("p95(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorP99:
		return fmt.Sprintf("p99(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorRate:
		return "rate()"
	case v3.AggregateOperatorRateSum:
		return fmt.Sprintf("rate_sum(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorRateAvg:
		return fmt.Sprintf("rate_avg(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorRateMin:
		return fmt.Sprintf("rate_min(%s)", v3Query.AggregateAttribute.Key)
	case v3.AggregateOperatorRateMax:
		return fmt.Sprintf("rate_max(%s)", v3Query.AggregateAttribute.Key)
	default:
		return "count()"
	}
}

func buildLogAggregationExpression(v3Query *v3.BuilderQuery) string {
	// Similar to traces
	return buildTraceAggregationExpression(v3Query)
}

func convertFilter(v3Filter *v3.FilterSet) *v5.Filter {
	if v3Filter == nil || len(v3Filter.Items) == 0 {
		return nil
	}

	expressions := []string{}
	for _, item := range v3Filter.Items {
		expr := buildFilterExpression(item)
		if expr != "" {
			expressions = append(expressions, expr)
		}
	}

	if len(expressions) == 0 {
		return nil
	}

	operator := "AND"
	if v3Filter.Operator == "OR" {
		operator = "OR"
	}

	return &v5.Filter{
		Expression: strings.Join(expressions, fmt.Sprintf(" %s ", operator)),
	}
}

func buildFilterExpression(item v3.FilterItem) string {
	key := item.Key.Key
	value := item.Value

	switch item.Operator {
	case v3.FilterOperatorEqual:
		return fmt.Sprintf("%s = %s", key, formatValue(value))
	case v3.FilterOperatorNotEqual:
		return fmt.Sprintf("%s != %s", key, formatValue(value))
	case v3.FilterOperatorGreaterThan:
		return fmt.Sprintf("%s > %s", key, formatValue(value))
	case v3.FilterOperatorGreaterThanOrEq:
		return fmt.Sprintf("%s >= %s", key, formatValue(value))
	case v3.FilterOperatorLessThan:
		return fmt.Sprintf("%s < %s", key, formatValue(value))
	case v3.FilterOperatorLessThanOrEq:
		return fmt.Sprintf("%s <= %s", key, formatValue(value))
	case v3.FilterOperatorIn:
		return fmt.Sprintf("%s IN %s", key, formatValue(value))
	case v3.FilterOperatorNotIn:
		return fmt.Sprintf("%s NOT IN %s", key, formatValue(value))
	case v3.FilterOperatorContains:
		return fmt.Sprintf("%s LIKE '%%%v%%'", key, value)
	case v3.FilterOperatorNotContains:
		return fmt.Sprintf("%s NOT LIKE '%%%v%%'", key, value)
	case v3.FilterOperatorRegex:
		return fmt.Sprintf("%s REGEXP %s", key, formatValue(value))
	case v3.FilterOperatorNotRegex:
		return fmt.Sprintf("%s NOT REGEXP %s", key, formatValue(value))
	case v3.FilterOperatorExists:
		return fmt.Sprintf("%s EXISTS", key)
	case v3.FilterOperatorNotExists:
		return fmt.Sprintf("%s NOT EXISTS", key)
	default:
		return ""
	}
}

func formatValue(value interface{}) string {
	return utils.ClickHouseFormattedValue(value)
}

func convertGroupBy(v3GroupBy []v3.AttributeKey) []v5.GroupByKey {
	v5GroupBy := []v5.GroupByKey{}
	for _, key := range v3GroupBy {
		v5GroupBy = append(v5GroupBy, v5.GroupByKey{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          key.Key,
				FieldDataType: convertDataType(key.DataType),
				FieldContext:  convertAttributeType(key.Type),
				Materialized:  key.IsColumn,
			},
		})
	}
	return v5GroupBy
}

func convertOrderBy(v3OrderBy []v3.OrderBy, v3Query *v3.BuilderQuery) []v5.OrderBy {
	v5OrderBy := []v5.OrderBy{}
	for _, order := range v3OrderBy {
		direction := v5.OrderDirectionAsc
		if order.Order == v3.DirectionDesc {
			direction = v5.OrderDirectionDesc
		}

		var orderByName string
		if order.ColumnName == "#SIGNOZ_VALUE" {
			if v3Query.DataSource == v3.DataSourceLogs || v3Query.DataSource == v3.DataSourceTraces {
				orderByName = buildTraceAggregationExpression(v3Query)
			} else {
				if v3Query.Expression != v3Query.QueryName {
					orderByName = v3Query.Expression
				} else {
					orderByName = fmt.Sprintf("%s(%s)", v3Query.SpaceAggregation, v3Query.AggregateAttribute.Key)
				}
			}
		} else {
			orderByName = order.ColumnName
		}

		v5OrderBy = append(v5OrderBy, v5.OrderBy{
			Key: v5.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:         orderByName,
					Materialized: order.IsColumn,
				},
			},
			Direction: direction,
		})
	}
	return v5OrderBy
}

func convertHaving(v3Having []v3.Having, v3Query *v3.BuilderQuery) *v5.Having {
	if len(v3Having) == 0 {
		return nil
	}

	expressions := []string{}
	for _, h := range v3Having {
		var expr string

		if v3Query.DataSource == v3.DataSourceLogs || v3Query.DataSource == v3.DataSourceTraces {
			h.ColumnName = buildTraceAggregationExpression(v3Query)
		} else {
			if v3Query.Expression != v3Query.QueryName {
				h.ColumnName = v3Query.Expression
			} else {
				h.ColumnName = fmt.Sprintf("%s(%s)", v3Query.SpaceAggregation, v3Query.AggregateAttribute.Key)
			}
		}
		expr = buildHavingExpression(h)

		if expr != "" {
			expressions = append(expressions, expr)
		}
	}

	if len(expressions) == 0 {
		return nil
	}

	return &v5.Having{
		Expression: strings.Join(expressions, " AND "),
	}
}

func buildHavingExpression(having v3.Having) string {

	switch having.Operator {
	case v3.HavingOperatorEqual:
		return fmt.Sprintf("%s = %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorNotEqual:
		return fmt.Sprintf("%s != %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorGreaterThan:
		return fmt.Sprintf("%s > %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorGreaterThanOrEq:
		return fmt.Sprintf("%s >= %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorLessThan:
		return fmt.Sprintf("%s < %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorLessThanOrEq:
		return fmt.Sprintf("%s <= %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorIn:
		return fmt.Sprintf("%s IN %s", having.ColumnName, formatValue(having.Value))
	case v3.HavingOperatorNotIn:
		return fmt.Sprintf("%s NOT IN %s", having.ColumnName, formatValue(having.Value))
	default:
		return ""
	}
}

func convertFunctions(v3Functions []v3.Function) []v5.Function {
	v5Functions := []v5.Function{}
	for _, fn := range v3Functions {
		v5Fn := v5.Function{
			Name: convertFunctionName(fn.Name),
			Args: []v5.FunctionArg{},
		}

		for _, arg := range fn.Args {
			v5Fn.Args = append(v5Fn.Args, v5.FunctionArg{
				Value: arg,
			})
		}

		for name, value := range fn.NamedArgs {
			v5Fn.Args = append(v5Fn.Args, v5.FunctionArg{
				Name:  name,
				Value: value,
			})
		}

		v5Functions = append(v5Functions, v5Fn)
	}
	return v5Functions
}

func convertFunctionName(v3Name v3.FunctionName) v5.FunctionName {
	switch v3Name {
	case v3.FunctionNameCutOffMin:
		return v5.FunctionNameCutOffMin
	case v3.FunctionNameCutOffMax:
		return v5.FunctionNameCutOffMax
	case v3.FunctionNameClampMin:
		return v5.FunctionNameClampMin
	case v3.FunctionNameClampMax:
		return v5.FunctionNameClampMax
	case v3.FunctionNameAbsolute:
		return v5.FunctionNameAbsolute
	case v3.FunctionNameRunningDiff:
		return v5.FunctionNameRunningDiff
	case v3.FunctionNameLog2:
		return v5.FunctionNameLog2
	case v3.FunctionNameLog10:
		return v5.FunctionNameLog10
	case v3.FunctionNameCumSum:
		return v5.FunctionNameCumulativeSum
	case v3.FunctionNameEWMA3:
		return v5.FunctionNameEWMA3
	case v3.FunctionNameEWMA5:
		return v5.FunctionNameEWMA5
	case v3.FunctionNameEWMA7:
		return v5.FunctionNameEWMA7
	case v3.FunctionNameMedian3:
		return v5.FunctionNameMedian3
	case v3.FunctionNameMedian5:
		return v5.FunctionNameMedian5
	case v3.FunctionNameMedian7:
		return v5.FunctionNameMedian7
	case v3.FunctionNameTimeShift:
		return v5.FunctionNameTimeShift
	case v3.FunctionNameAnomaly:
		return v5.FunctionNameAnomaly
	default:
		return v5.FunctionName{}
	}
}

func convertSelectColumns(cols []v3.AttributeKey) []telemetrytypes.TelemetryFieldKey {
	fields := []telemetrytypes.TelemetryFieldKey{}

	for _, key := range cols {
		newKey := telemetrytypes.TelemetryFieldKey{
			Name: key.Key,
		}

		if _, exists := constants.NewStaticFieldsTraces[key.Key]; exists {
			fields = append(fields, newKey)
			continue
		}

		if _, exists := constants.DeprecatedStaticFieldsTraces[key.Key]; exists {
			fields = append(fields, newKey)
			continue
		}

		if _, exists := constants.StaticFieldsLogsV3[key.Key]; exists {
			fields = append(fields, newKey)
			continue
		}

		newKey.FieldDataType = convertDataType(key.DataType)
		newKey.FieldContext = convertAttributeType(key.Type)
		newKey.Materialized = key.IsColumn
	}
	return fields
}

func convertDataType(v3Type v3.AttributeKeyDataType) telemetrytypes.FieldDataType {
	switch v3Type {
	case v3.AttributeKeyDataTypeString:
		return telemetrytypes.FieldDataTypeString
	case v3.AttributeKeyDataTypeInt64:
		return telemetrytypes.FieldDataTypeInt64
	case v3.AttributeKeyDataTypeFloat64:
		return telemetrytypes.FieldDataTypeFloat64
	case v3.AttributeKeyDataTypeBool:
		return telemetrytypes.FieldDataTypeBool
	case v3.AttributeKeyDataTypeArrayString:
		return telemetrytypes.FieldDataTypeArrayString
	case v3.AttributeKeyDataTypeArrayInt64:
		return telemetrytypes.FieldDataTypeArrayInt64
	case v3.AttributeKeyDataTypeArrayFloat64:
		return telemetrytypes.FieldDataTypeArrayFloat64
	case v3.AttributeKeyDataTypeArrayBool:
		return telemetrytypes.FieldDataTypeArrayBool
	default:
		return telemetrytypes.FieldDataTypeUnspecified
	}
}

func convertAttributeType(v3Type v3.AttributeKeyType) telemetrytypes.FieldContext {
	switch v3Type {
	case v3.AttributeKeyTypeTag:
		return telemetrytypes.FieldContextAttribute
	case v3.AttributeKeyTypeResource:
		return telemetrytypes.FieldContextResource
	case v3.AttributeKeyTypeInstrumentationScope:
		return telemetrytypes.FieldContextScope
	default:
		return telemetrytypes.FieldContextUnspecified
	}
}

func convertTemporality(v3Temp v3.Temporality) metrictypes.Temporality {
	switch v3Temp {
	case v3.Delta:
		return metrictypes.Delta
	case v3.Cumulative:
		return metrictypes.Cumulative
	default:
		return metrictypes.Unspecified
	}
}

func convertTimeAggregation(v3TimeAgg v3.TimeAggregation) metrictypes.TimeAggregation {
	switch v3TimeAgg {
	case v3.TimeAggregationAnyLast:
		return metrictypes.TimeAggregationLatest
	case v3.TimeAggregationSum:
		return metrictypes.TimeAggregationSum
	case v3.TimeAggregationAvg:
		return metrictypes.TimeAggregationAvg
	case v3.TimeAggregationMin:
		return metrictypes.TimeAggregationMin
	case v3.TimeAggregationMax:
		return metrictypes.TimeAggregationMax
	case v3.TimeAggregationCount:
		return metrictypes.TimeAggregationCount
	case v3.TimeAggregationCountDistinct:
		return metrictypes.TimeAggregationCountDistinct
	case v3.TimeAggregationRate:
		return metrictypes.TimeAggregationRate
	case v3.TimeAggregationIncrease:
		return metrictypes.TimeAggregationIncrease
	default:
		return metrictypes.TimeAggregationUnspecified
	}
}

func convertSpaceAggregation(v3SpaceAgg v3.SpaceAggregation) metrictypes.SpaceAggregation {
	switch v3SpaceAgg {
	case v3.SpaceAggregationSum:
		return metrictypes.SpaceAggregationSum
	case v3.SpaceAggregationAvg:
		return metrictypes.SpaceAggregationAvg
	case v3.SpaceAggregationMin:
		return metrictypes.SpaceAggregationMin
	case v3.SpaceAggregationMax:
		return metrictypes.SpaceAggregationMax
	case v3.SpaceAggregationCount:
		return metrictypes.SpaceAggregationCount
	case v3.SpaceAggregationPercentile50:
		return metrictypes.SpaceAggregationPercentile50
	case v3.SpaceAggregationPercentile75:
		return metrictypes.SpaceAggregationPercentile75
	case v3.SpaceAggregationPercentile90:
		return metrictypes.SpaceAggregationPercentile90
	case v3.SpaceAggregationPercentile95:
		return metrictypes.SpaceAggregationPercentile95
	case v3.SpaceAggregationPercentile99:
		return metrictypes.SpaceAggregationPercentile99
	default:
		return metrictypes.SpaceAggregationUnspecified
	}
}

func convertClickHouseQueries(v3Queries map[string]*v3.ClickHouseQuery, v5Composite *v5.CompositeQuery) error {
	for name, query := range v3Queries {
		if query == nil {
			continue
		}

		v5Envelope := v5.QueryEnvelope{
			Type: v5.QueryTypeClickHouseSQL,
			Spec: v5.ClickHouseQuery{
				Name:     name,
				Query:    query.Query,
				Disabled: query.Disabled,
			},
		}
		v5Composite.Queries = append(v5Composite.Queries, v5Envelope)
	}
	return nil
}

func convertPromQueries(v3Queries map[string]*v3.PromQuery, step int64, v5Composite *v5.CompositeQuery) error {
	for name, query := range v3Queries {
		if query == nil {
			continue
		}

		v5Envelope := v5.QueryEnvelope{
			Type: v5.QueryTypePromQL,
			Spec: v5.PromQuery{
				Name:     name,
				Query:    query.Query,
				Disabled: query.Disabled,
				Step:     v5.Step{Duration: time.Duration(step) * time.Second},
				Stats:    query.Stats != "",
			},
		}
		v5Composite.Queries = append(v5Composite.Queries, v5Envelope)
	}
	return nil
}
