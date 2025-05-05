package tracefunnel

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	tracefunnel "github.com/SigNoz/signoz/pkg/types/tracefunnel"
)

func getColumnName(key v3.AttributeKey) string {
	if key.IsColumn {
		return key.Key
	}
	filterType, filterDataType := getClickhouseTracesColumnDataTypeAndType(key)
	return fmt.Sprintf("%s%s['%s']", filterDataType, filterType, key.Key)
}

func getClickhouseTracesColumnDataTypeAndType(key v3.AttributeKey) (v3.AttributeKeyType, string) {
	filterType := key.Type
	filterDataType := "string"
	if key.DataType == v3.AttributeKeyDataTypeFloat64 || key.DataType == v3.AttributeKeyDataTypeInt64 {
		filterDataType = "number"
	} else if key.DataType == v3.AttributeKeyDataTypeBool {
		filterDataType = "bool"
	}
	if filterType == v3.AttributeKeyTypeTag {
		filterType = "TagMap"
	} else {
		filterType = "resourceTagsMap"
		filterDataType = ""
	}
	return filterType, filterDataType
}

// buildFilterClause converts a FilterSet into a SQL WHERE clause string
func buildFilterClause(filters *v3.FilterSet) string {
	if filters == nil || len(filters.Items) == 0 {
		return ""
	}

	var conditions []string
	for _, item := range filters.Items {
		// Get the column name based on the key type
		columnName := getColumnName(item.Key)

		// Convert operator to lowercase for consistency
		op := strings.ToLower(string(item.Operator))

		// Format the value based on its type
		var valueStr string
		var err error
		if op != "exists" && op != "nexists" {
			item.Value, err = utils.ValidateAndCastValue(item.Value, item.Key.DataType)
			if err != nil {
				continue // Skip invalid values
			}
			valueStr = utils.ClickHouseFormattedValue(item.Value)
		}

		// Build the condition based on the operator
		var condition string
		switch op {
		case "exists":
			if item.Key.IsColumn {
				condition = fmt.Sprintf("%s != ''", columnName)
			} else {
				columnType, columnDataType := getClickhouseTracesColumnDataTypeAndType(item.Key)
				condition = fmt.Sprintf("has(%s%s, '%s')", columnDataType, columnType, item.Key.Key)
			}
		case "nexists":
			if item.Key.IsColumn {
				condition = fmt.Sprintf("%s = ''", columnName)
			} else {
				columnType, columnDataType := getClickhouseTracesColumnDataTypeAndType(item.Key)
				condition = fmt.Sprintf("NOT has(%s%s, '%s')", columnDataType, columnType, item.Key.Key)
			}
		case "contains", "ncontains":
			val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
			operator := "ILIKE"
			if op == "ncontains" {
				operator = "NOT ILIKE"
			}
			condition = fmt.Sprintf("%s %s '%%%s%%'", columnName, operator, val)
		case "regex", "nregex":
			operator := "match"
			if op == "nregex" {
				operator = "NOT match"
			}
			condition = fmt.Sprintf("%s(%s, %s)", operator, columnName, valueStr)
		default:
			condition = fmt.Sprintf("%s %s %s", columnName, strings.ToUpper(op), valueStr)
		}
		conditions = append(conditions, condition)
	}

	// Join conditions with the operator (AND/OR)
	operator := strings.ToUpper(filters.Operator)
	if operator == "" {
		operator = "AND" // Default to AND if not specified
	}
	return strings.Join(conditions, fmt.Sprintf(" %s ", operator))
}

func ValidateTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	// Build filter clauses for each step
	clauseStep1 := buildFilterClause(funnelSteps[0].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[1].Filters)
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3 = buildFilterClause(funnelSteps[2].Filters)
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelValidationQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			containsErrorT3,            // containsErrorT3
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelValidationQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetFunnelAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0
	latencyPointerT1 := "start"
	latencyPointerT2 := "start"
	latencyPointerT3 := "start"

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	if funnelSteps[0].LatencyPointer != "" {
		latencyPointerT1 = "end"
	}
	if funnelSteps[1].LatencyPointer != "" {
		latencyPointerT2 = "end"
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].LatencyPointer != "" {
		latencyPointerT3 = "end"
	}

	// Build filter clauses for each step
	clauseStep1 := buildFilterClause(funnelSteps[0].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[1].Filters)
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3 = buildFilterClause(funnelSteps[2].Filters)
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			containsErrorT3, // containsErrorT3
			latencyPointerT1,
			latencyPointerT2,
			latencyPointerT3,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			latencyPointerT1,
			latencyPointerT2,
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}
	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetFunnelStepAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	var query string

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0
	latencyPointerT1 := "start"
	latencyPointerT2 := "start"
	latencyPointerT3 := "start"
	stepStartOrder := 0
	stepEndOrder := 1

	if stepStart != stepEnd {
		stepStartOrder = int(stepStart) - 1
		stepEndOrder = int(stepEnd) - 1
		if funnelSteps[stepStartOrder].HasErrors {
			containsErrorT1 = 1
		}
		if funnelSteps[stepEndOrder].HasErrors {
			containsErrorT2 = 1
		}
		if funnelSteps[stepStartOrder].LatencyPointer != "" {
			latencyPointerT1 = "end"
		}
		if funnelSteps[stepEndOrder].LatencyPointer != "" {
			latencyPointerT2 = "end"
		}
	}

	// Build filter clauses for the steps
	clauseStep1 := buildFilterClause(funnelSteps[stepStartOrder].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[stepEndOrder].Filters)
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3 = buildFilterClause(funnelSteps[2].Filters)
	}

	if stepStart == 2 {
		query = BuildFunnelStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			containsErrorT3,
			latencyPointerT1,
			latencyPointerT2,
			latencyPointerT3,
			timeRange.StartTime, // startTs
			timeRange.EndTime,   // endTs
			funnelSteps[0].ServiceName,
			funnelSteps[0].SpanName,
			funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
			funnelSteps[stepStartOrder].SpanName,    // spanNameT1
			funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
			funnelSteps[stepEndOrder].SpanName,      // spanNameT2
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelOverviewQuery(
			containsErrorT1, // containsErrorT1
			containsErrorT2, // containsErrorT2
			latencyPointerT1,
			latencyPointerT2,
			timeRange.StartTime,                     // startTs
			timeRange.EndTime,                       // endTs
			funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
			funnelSteps[stepStartOrder].SpanName,    // spanNameT1
			funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
			funnelSteps[stepEndOrder].SpanName,      // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}

	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetStepAnalytics(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange) (*v3.ClickHouseQuery, error) {
	var query string

	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	containsErrorT3 := 0

	if funnelSteps[0].HasErrors {
		containsErrorT1 = 1
	}
	if funnelSteps[1].HasErrors {
		containsErrorT2 = 1
	}
	if len(funnel.Steps) > 2 && funnelSteps[2].HasErrors {
		containsErrorT3 = 1
	}

	// Build filter clauses for each step
	clauseStep1 := buildFilterClause(funnelSteps[0].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[1].Filters)
	clauseStep3 := ""
	if len(funnel.Steps) > 2 {
		clauseStep3 = buildFilterClause(funnelSteps[2].Filters)
	}

	if len(funnel.Steps) > 2 {
		query = BuildThreeStepFunnelCountQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			containsErrorT3,            // containsErrorT3
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			funnelSteps[2].ServiceName, // serviceNameT1
			funnelSteps[2].SpanName,    // spanNameT3
			clauseStep1,
			clauseStep2,
			clauseStep3,
		)
	} else {
		query = BuildTwoStepFunnelCountQuery(
			containsErrorT1,            // containsErrorT1
			containsErrorT2,            // containsErrorT2
			timeRange.StartTime,        // startTs
			timeRange.EndTime,          // endTs
			funnelSteps[0].ServiceName, // serviceNameT1
			funnelSteps[0].SpanName,    // spanNameT1
			funnelSteps[1].ServiceName, // serviceNameT1
			funnelSteps[1].SpanName,    // spanNameT2
			clauseStep1,
			clauseStep2,
		)
	}

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func GetSlowestTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	stepStartOrder := 0
	stepEndOrder := 1

	if stepStart != stepEnd {
		stepStartOrder = int(stepStart) - 1
		stepEndOrder = int(stepEnd) - 1
		if funnelSteps[stepStartOrder].HasErrors {
			containsErrorT1 = 1
		}
		if funnelSteps[stepEndOrder].HasErrors {
			containsErrorT2 = 1
		}
	}

	// Build filter clauses for the steps
	clauseStep1 := buildFilterClause(funnelSteps[stepStartOrder].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[stepEndOrder].Filters)

	query := BuildTwoStepFunnelTopSlowTracesQuery(
		containsErrorT1,                         // containsErrorT1
		containsErrorT2,                         // containsErrorT2
		timeRange.StartTime,                     // startTs
		timeRange.EndTime,                       // endTs
		funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
		funnelSteps[stepStartOrder].SpanName,    // spanNameT1
		funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
		funnelSteps[stepEndOrder].SpanName,      // spanNameT2
		clauseStep1,
		clauseStep2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}

func GetErroredTraces(funnel *tracefunnel.Funnel, timeRange tracefunnel.TimeRange, stepStart, stepEnd int64) (*v3.ClickHouseQuery, error) {
	funnelSteps := funnel.Steps
	containsErrorT1 := 0
	containsErrorT2 := 0
	stepStartOrder := 0
	stepEndOrder := 1

	if stepStart != stepEnd {
		stepStartOrder = int(stepStart) - 1
		stepEndOrder = int(stepEnd) - 1
		if funnelSteps[stepStartOrder].HasErrors {
			containsErrorT1 = 1
		}
		if funnelSteps[stepEndOrder].HasErrors {
			containsErrorT2 = 1
		}
	}

	// Build filter clauses for the steps
	clauseStep1 := buildFilterClause(funnelSteps[stepStartOrder].Filters)
	clauseStep2 := buildFilterClause(funnelSteps[stepEndOrder].Filters)

	query := BuildTwoStepFunnelTopSlowErrorTracesQuery(
		containsErrorT1,                         // containsErrorT1
		containsErrorT2,                         // containsErrorT2
		timeRange.StartTime,                     // startTs
		timeRange.EndTime,                       // endTs
		funnelSteps[stepStartOrder].ServiceName, // serviceNameT1
		funnelSteps[stepStartOrder].SpanName,    // spanNameT1
		funnelSteps[stepEndOrder].ServiceName,   // serviceNameT1
		funnelSteps[stepEndOrder].SpanName,      // spanNameT2
		clauseStep1,
		clauseStep2,
	)
	return &v3.ClickHouseQuery{Query: query}, nil
}
