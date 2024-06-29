package postprocess

import (
	"fmt"
	"math"
	"sort"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func roundToTwoDecimal(number float64) float64 {
	// Handle very small numbers
	if math.Abs(number) < 0.000001 {
		return 0
	}

	// Determine the number of decimal places to round to
	decimalPlaces := 2
	if math.Abs(number) < 0.01 {
		decimalPlaces = int(math.Ceil(-math.Log10(math.Abs(number)))) + 1
	}

	// Round to the determined number of decimal places
	scale := math.Pow(10, float64(decimalPlaces))
	return math.Round(number*scale) / scale
}

func TransformToTableForBuilderQueries(results []*v3.Result, params *v3.QueryRangeParamsV3) []*v3.Result {
	if len(results) == 0 {
		return []*v3.Result{}
	}

	// Sort results by QueryName
	sort.Slice(results, func(i, j int) bool {
		return results[i].QueryName < results[j].QueryName
	})

	// Create a map to store all unique labels
	seen := make(map[string]struct{})
	labelKeys := []string{}
	for _, result := range results {
		for _, series := range result.Series {
			for _, labels := range series.LabelsArray {
				for key := range labels {
					if _, ok := seen[key]; !ok {
						seen[key] = struct{}{}
						labelKeys = append(labelKeys, key)
					}
				}
			}
		}
	}

	// Create columns
	// There will be one column for each label key and one column for each query name
	columns := make([]*v3.TableColumn, 0, len(labelKeys)+len(results))
	for _, key := range labelKeys {
		columns = append(columns, &v3.TableColumn{Name: key, IsValueColumn: false})
	}
	for _, result := range results {
		columns = append(columns, &v3.TableColumn{Name: result.QueryName, QueryName: result.QueryName, IsValueColumn: true})
	}

	// Create a map to store unique rows
	rowMap := make(map[string]*v3.TableRow)

	for _, result := range results {
		for _, series := range result.Series {
			if len(series.Points) == 0 {
				continue
			}

			// Create a key for the row based on labels
			var keyParts []string
			rowData := make(map[string]interface{}, len(columns))
			for _, key := range labelKeys {
				value := "n/a"
				for _, labels := range series.LabelsArray {
					if v, ok := labels[key]; ok {
						value = v
						break
					}
				}
				keyParts = append(keyParts, fmt.Sprintf("%s=%s", key, value))
				rowData[key] = value
			}
			rowKey := strings.Join(keyParts, ",")

			// Get or create the row
			row, ok := rowMap[rowKey]
			if !ok {
				row = &v3.TableRow{Data: rowData, QueryName: result.QueryName}
				rowMap[rowKey] = row
			}

			// Add the value for this query
			for _, col := range columns {
				if col.Name == result.QueryName {
					row.Data[col.Name] = roundToTwoDecimal(series.Points[0].Value)
					break
				}
			}
		}
	}

	// Convert rowMap to a slice of TableRows
	rows := make([]*v3.TableRow, 0, len(rowMap))
	for _, row := range rowMap {
		rows = append(rows, row)
	}

	// Get sorted query names
	queryNames := make([]string, 0, len(params.CompositeQuery.BuilderQueries))
	for queryName := range params.CompositeQuery.BuilderQueries {
		queryNames = append(queryNames, queryName)
	}
	sort.Strings(queryNames)

	// Sort rows based on OrderBy from BuilderQueries
	sortRows(rows, params.CompositeQuery.BuilderQueries, queryNames)

	for _, row := range rows {
		for _, col := range columns {
			if col.IsValueColumn {
				if row.Data[col.Name] == nil {
					row.Data[col.Name] = "n/a"
				}
			}
		}
	}

	// Create the final result
	tableResult := v3.Result{
		Table: &v3.Table{
			Columns: columns,
			Rows:    rows,
		},
	}

	return []*v3.Result{&tableResult}
}

func sortRows(rows []*v3.TableRow, builderQueries map[string]*v3.BuilderQuery, queryNames []string) {
	// use reverse order of queryNames
	for i := len(queryNames) - 1; i >= 0; i-- {
		queryName := queryNames[i]
		sort.SliceStable(rows, func(i, j int) bool {
			query := builderQueries[queryName]
			orderByList := query.OrderBy
			if len(orderByList) == 0 {
				// If no orderBy is specified, sort by value in descending order
				orderByList = []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}
			}
			for _, orderBy := range orderByList {
				name := orderBy.ColumnName
				if name == constants.SigNozOrderByValue {
					name = queryName
				}

				valI := rows[i].Data[name]
				valJ := rows[j].Data[name]

				if valI == nil || valJ == nil {
					return rows[i].QueryName < rows[j].QueryName
				}

				// Compare based on the data type
				switch v := valI.(type) {
				case float64:
					switch w := valJ.(type) {
					case float64:
						if v != w {
							return (v < w) == (orderBy.Order == "asc")
						}
					default:
						// For any other type, sort float64 first
						return orderBy.Order == "asc"
					}
				case string:
					switch w := valJ.(type) {
					case float64:
						// If types are different, sort numbers before strings
						return orderBy.Order != "asc"
					case string:
						if v != w {
							return (v < w) == (orderBy.Order == "asc")
						}
					default:
						// For any other type, sort strings before bools
						return orderBy.Order == "asc"
					}
				case bool:
					switch w := valJ.(type) {
					case float64, string:
						// If types are different, sort bools after numbers and strings
						return orderBy.Order != "asc"
					case bool:
						if v != w {
							return (!v && w) == (orderBy.Order == "asc")
						}
					}
				}
			}
			return false
		})
	}
}

func TransformToTableForClickHouseQueries(results []*v3.Result) []*v3.Result {
	if len(results) == 0 {
		return []*v3.Result{}
	}

	// Sort results by QueryName
	sort.Slice(results, func(i, j int) bool {
		return results[i].QueryName < results[j].QueryName
	})

	// Create a map to store all unique labels
	seen := make(map[string]struct{})
	labelKeys := []string{}
	for _, result := range results {
		for _, series := range result.Series {
			for _, labels := range series.LabelsArray {
				for key := range labels {
					if _, ok := seen[key]; !ok {
						seen[key] = struct{}{}
						labelKeys = append(labelKeys, key)
					}
				}
			}
		}
	}

	// Create columns
	// Why don't we have a column for each query name?
	// Because we don't know if the query is an aggregation query or a non-aggregation query
	// So we create a column for each query name that has at least one point
	columns := make([]*v3.TableColumn, 0)
	for _, key := range labelKeys {
		columns = append(columns, &v3.TableColumn{Name: key, IsValueColumn: false})
	}
	for _, result := range results {
		if len(result.Series) > 0 && len(result.Series[0].Points) > 0 {
			columns = append(columns, &v3.TableColumn{Name: result.QueryName, QueryName: result.QueryName, IsValueColumn: true})
		}
	}

	rows := make([]*v3.TableRow, 0)
	for _, result := range results {
		for _, series := range result.Series {

			// Create a key for the row based on labels
			rowData := make(map[string]interface{}, len(columns))
			for _, key := range labelKeys {
				value := "n/a"
				for _, labels := range series.LabelsArray {
					if v, ok := labels[key]; ok {
						value = v
						break
					}
				}
				rowData[key] = value
			}

			// Get or create the row
			row := &v3.TableRow{Data: rowData, QueryName: result.QueryName}

			// Add the value for this query
			for _, col := range columns {
				if col.Name == result.QueryName && len(series.Points) > 0 {
					row.Data[col.Name] = roundToTwoDecimal(series.Points[0].Value)
					break
				}
			}
			rows = append(rows, row)
		}
	}

	for _, row := range rows {
		for _, col := range columns {
			if col.IsValueColumn {
				if row.Data[col.Name] == nil {
					row.Data[col.Name] = "n/a"
				}
			}
		}
	}

	// Create the final result
	tableResult := v3.Result{
		Table: &v3.Table{
			Columns: columns,
			Rows:    rows,
		},
	}

	return []*v3.Result{&tableResult}
}
