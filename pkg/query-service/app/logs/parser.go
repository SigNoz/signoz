package logs

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"go.signoz.io/query-service/model"
)

var operatorMapping = map[string]string{
	"eq":    "=",
	"neq":   "!=",
	"lt":    "<",
	"gt":    ">",
	"lte":   "<=",
	"gte":   ">=",
	"in":    "in",
	"like":  "like",
	"ilike": "ilike",
}

func arrayToMap(fields []model.LogField) map[string]model.LogField {
	res := map[string]model.LogField{}
	for _, field := range fields {
		res[field.Name] = field
	}
	return res
}

func ParseFilterParams(r *http.Request) (*model.LogsFilterParams, error) {
	res := model.LogsFilterParams{
		Limit:   30,
		OrderBy: "timestamp",
		Order:   "desc",
	}
	var err error
	params := r.URL.Query()
	filters := []model.LogFilter{}
	if val, ok := params["limit"]; ok {
		res.Limit, err = strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
	}
	if val, ok := params["orderBy"]; ok {
		res.OrderBy = val[0]
	}
	if val, ok := params["order"]; ok {
		res.Order = val[0]
	}
	if val, ok := params["filter"]; ok {
		err := json.Unmarshal([]byte(val[0]), &filters)
		if err != nil {
			return nil, err
		}
	}
	res.Filters = filters
	return &res, nil
}

func ParseLogFilter(allFields *model.GetFieldsResponse, filters *[]model.LogFilter) (*string, error) {
	fLen := len(*filters)
	if fLen <= 0 {
		return nil, nil
	}

	selectedFieldsLookup := arrayToMap(allFields.Selected)
	interestingFieldLookup := arrayToMap(allFields.Interesting)
	filterSql := ""
	for fIndx := 0; fIndx < fLen; fIndx++ {
		filter := (*filters)[fIndx]
		fieldSQLName := filter.Column
		if _, ok := selectedFieldsLookup[filter.Column]; !ok {
			if field, ok := interestingFieldLookup[filter.Column]; ok {
				fieldSQLName = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", field.Type, strings.ToLower(field.DataType), field.Type, strings.ToLower(field.DataType), filter.Column)
			} else {
				return nil, fmt.Errorf("field not found for filtering")
			}
		}

		filterSql += "("
		vLen := len(filter.Value)
		for i := 0; i < vLen; i++ {
			filterSql += fmt.Sprintf("%s%s'%v'", fieldSQLName, operatorMapping[filter.Operation], filter.Value[i])
			if i != vLen-1 {
				filterSql += " or "
			}
		}
		filterSql += ")"

		if fIndx != fLen-1 {
			filterSql += " and "
		}
	}

	return &filterSql, nil
}
