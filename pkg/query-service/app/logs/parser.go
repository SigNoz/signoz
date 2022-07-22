package logs

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"go.signoz.io/query-service/model"
)

var operatorMapping = map[string]string{
	"lt":        "<",
	"gt":        ">",
	"lte":       "<=",
	"gte":       ">=",
	"in":        "IN",
	"nin":       "NOT IN",
	"contains":  "ILIKE",
	"ncontains": "NOT ILIKE",
}

const (
	AND = "and"
)

var tokenRegex, _ = regexp.Compile(`(?i)(and( )*?)?(([\w.-]+ (in|nin) \([\S ]+\))|([\w.]+ (gt|lt|gte|lte) (')?[\S]+(')?)|([\w.]+ (contains|ncontains)) (')?[\S ]+(')?)`)
var operatorRegex, _ = regexp.Compile(`(?i)(?: )(in|nin|gt|lt|gte|lte|contains|ncontains)(?: )`)

func ParseLogFilterParams(r *http.Request) (*model.LogsFilterParams, error) {
	res := model.LogsFilterParams{
		Limit:   30,
		OrderBy: "timestamp",
		Order:   "desc",
	}
	var err error
	params := r.URL.Query()
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
	if val, ok := params["q"]; ok {
		res.Query = &val[0]
	}
	if val, ok := params["timestampStart"]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		ts64 := uint64(ts)
		res.TimestampStart = &ts64
	}
	if val, ok := params["timestampEnd"]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		ts64 := uint64(ts)
		res.TimestampEnd = &ts64
	}
	if val, ok := params["idStart"]; ok {
		res.IdStart = &val[0]
	}
	if val, ok := params["idEnd"]; ok {
		res.IdEnd = &val[0]
	}
	return &res, nil
}

func ParseLiveTailFilterParams(r *http.Request) (*model.LogsFilterParams, error) {
	res := model.LogsFilterParams{}
	params := r.URL.Query()
	if val, ok := params["q"]; ok {
		res.Query = &val[0]
	}
	if val, ok := params["timestampStart"]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		ts64 := uint64(ts)
		res.TimestampStart = &ts64
	}
	if val, ok := params["idStart"]; ok {
		res.IdStart = &val[0]
	}
	return &res, nil
}

func ParseLogAggregateParams(r *http.Request) (*model.LogsAggregateParams, error) {
	res := model.LogsAggregateParams{}
	params := r.URL.Query()
	if val, ok := params["timestampStart"]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		ts64 := uint64(ts)
		res.TimestampStart = &ts64
	} else {
		return nil, fmt.Errorf("timestampStart is required")
	}
	if val, ok := params["timestampEnd"]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		ts64 := uint64(ts)
		res.TimestampEnd = &ts64
	} else {
		return nil, fmt.Errorf("timestampEnd is required")
	}

	if val, ok := params["q"]; ok {
		res.Query = &val[0]
	}

	if val, ok := params["groupBy"]; ok {
		res.GroupBy = &val[0]
	}

	if val, ok := params["function"]; ok {
		res.Function = &val[0]
	}

	if val, ok := params["step"]; ok {
		step, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.StepSeconds = &step
	} else {
		return nil, fmt.Errorf("step is required")
	}
	return &res, nil
}

func parseLogQuery(query string) ([]string, error) {
	sqlQueryTokens := []string{}
	filterTokens := tokenRegex.FindAllString(query, -1)

	if len(filterTokens) == 0 {
		sqlQueryTokens = append(sqlQueryTokens, fmt.Sprintf("body ILIKE '%%%s%%' ", query))
		return sqlQueryTokens, nil
	}

	// replace and check if there is something that is lying around
	if len(strings.TrimSpace(tokenRegex.ReplaceAllString(query, ""))) > 0 {
		return nil, fmt.Errorf("failed to parse query, contains unknown tokens")
	}

	for _, v := range filterTokens {
		op := strings.TrimSpace(operatorRegex.FindString(v))
		opLower := strings.ToLower(op)

		if opLower == "contains" || opLower == "ncontains" {
			searchString := strings.TrimSpace(strings.Split(v, op)[1])

			operatorRemovedTokens := strings.Split(operatorRegex.ReplaceAllString(v, " "), " ")
			searchCol := strings.ToLower(operatorRemovedTokens[0])
			if searchCol == AND {
				searchCol = strings.ToLower(operatorRemovedTokens[1])
			}
			col := searchCol
			if strings.ToLower(searchCol) == "fulltext" {
				col = "body"
			}

			f := fmt.Sprintf(`%s %s '%%%s%%' `, col, operatorMapping[opLower], searchString[1:len(searchString)-1])
			if strings.HasPrefix(strings.ToLower(v), AND) {
				f = "AND " + f
			}
			sqlQueryTokens = append(sqlQueryTokens, f)
		} else {
			symbol := operatorMapping[strings.ToLower(op)]
			sqlQueryTokens = append(sqlQueryTokens, strings.Replace(v, " "+op+" ", " "+symbol+" ", 1)+" ")
		}
	}

	return sqlQueryTokens, nil
}

func parseColumn(s string) (*string, error) {
	s = strings.ToLower(s)

	colName := ""

	// if has and/or as prefix
	filter := strings.Split(s, " ")
	if len(filter) < 3 {
		return nil, fmt.Errorf("incorrect filter")
	}

	if strings.HasPrefix(s, AND) {
		colName = filter[1]
	} else {
		colName = filter[0]
	}

	return &colName, nil
}

func arrayToMap(fields []model.LogField) map[string]model.LogField {
	res := map[string]model.LogField{}
	for _, field := range fields {
		res[field.Name] = field
	}
	return res
}

func replaceInterestingFields(allFields *model.GetFieldsResponse, queryTokens []string) ([]string, error) {
	// check if cols
	selectedFieldsLookup := arrayToMap(allFields.Selected)
	interestingFieldLookup := arrayToMap(allFields.Interesting)

	for index := 0; index < len(queryTokens); index++ {
		queryToken := queryTokens[index]
		col, err := parseColumn(queryToken)
		if err != nil {
			return nil, err
		}

		sqlColName := *col
		if _, ok := selectedFieldsLookup[*col]; !ok && *col != "body" {
			if field, ok := interestingFieldLookup[*col]; ok {
				sqlColName = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", field.Type, strings.ToLower(field.DataType), field.Type, strings.ToLower(field.DataType), *col)
			} else {
				return nil, fmt.Errorf("field not found for filtering")
			}
		}
		queryTokens[index] = strings.Replace(queryToken, *col, sqlColName, 1)
	}
	return queryTokens, nil
}

func GenerateSQLWhere(allFields *model.GetFieldsResponse, params *model.LogsFilterParams) (string, error) {
	var tokens []string
	var err error
	var sqlWhere string
	if params.Query != nil {
		tokens, err = parseLogQuery(*params.Query)
		if err != nil {
			return sqlWhere, err
		}
	}

	tokens, err = replaceInterestingFields(allFields, tokens)
	if err != nil {
		return sqlWhere, err
	}

	if params.TimestampStart != nil {
		filter := fmt.Sprintf("timestamp >= '%d' ", *params.TimestampStart)
		if len(tokens) > 0 {
			filter = "and " + filter
		}
		tokens = append(tokens, filter)
	}
	if params.TimestampEnd != nil {
		filter := fmt.Sprintf("timestamp <= '%d' ", *params.TimestampEnd)
		if len(tokens) > 0 {
			filter = "and " + filter
		}
		tokens = append(tokens, filter)
	}
	if params.IdStart != nil {
		filter := fmt.Sprintf("id > '%v' ", *params.IdStart)
		if len(tokens) > 0 {
			filter = "and " + filter
		}
		tokens = append(tokens, filter)
	}
	if params.IdEnd != nil {
		filter := fmt.Sprintf("id < '%v' ", *params.IdEnd)
		if len(tokens) > 0 {
			filter = "and " + filter
		}
		tokens = append(tokens, filter)
	}

	sqlWhere = strings.Join(tokens, "")

	return sqlWhere, nil
}
