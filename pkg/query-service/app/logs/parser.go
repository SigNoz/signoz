package logs

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
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
	AND             = "and"
	OR              = "or"
	ORDER           = "order"
	ORDER_BY        = "orderBy"
	TIMESTAMP_START = "timestampStart"
	TIMESTAMP_END   = "timestampEnd"
	IdGt            = "idGt"
	IdLT            = "idLt"
	TIMESTAMP       = "timestamp"
	ASC             = "asc"
	DESC            = "desc"
)

var tokenRegex, _ = regexp.Compile(`(?i)(and( )*?|or( )*?)?(([\w.-]+( )+(in|nin)( )+\([^(]+\))|([\w.]+( )+(gt|lt|gte|lte)( )+(')?[\S]+(')?)|([\w.]+( )+(contains|ncontains))( )+[^\\]?'(.*?[^\\])'|([\w.]+( )+(exists|nexists)( )?))`)
var operatorRegex, _ = regexp.Compile(`(?i)(?: )(in|nin|gte|lte|gt|lt|contains|ncontains|exists|nexists)(?: )?`)

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
	if val, ok := params[ORDER_BY]; ok {
		res.OrderBy = val[0]
	}
	if val, ok := params[ORDER]; ok {
		if val[0] == ASC || val[0] == DESC {
			res.Order = val[0]
		}
	}
	if val, ok := params["q"]; ok {
		res.Query = val[0]
	}
	if val, ok := params[TIMESTAMP_START]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.TimestampStart = uint64(ts)
	}
	if val, ok := params[TIMESTAMP_END]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.TimestampEnd = uint64(ts)
	}
	if val, ok := params[IdGt]; ok {
		res.IdGt = val[0]
	}
	if val, ok := params[IdLT]; ok {
		res.IdLT = val[0]
	}
	return &res, nil
}

func ParseLiveTailFilterParams(r *http.Request) (*model.LogsFilterParams, error) {
	res := model.LogsFilterParams{}
	params := r.URL.Query()
	if val, ok := params["q"]; ok {
		res.Query = val[0]
	}
	if val, ok := params[TIMESTAMP_START]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.TimestampStart = uint64(ts)
	}
	if val, ok := params[IdGt]; ok {
		res.IdGt = val[0]
	}
	return &res, nil
}

func ParseLogAggregateParams(r *http.Request) (*model.LogsAggregateParams, error) {
	res := model.LogsAggregateParams{}
	params := r.URL.Query()
	if val, ok := params[TIMESTAMP_START]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.TimestampStart = uint64(ts)
	} else {
		return nil, fmt.Errorf("timestampStart is required")
	}
	if val, ok := params[TIMESTAMP_END]; ok {
		ts, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.TimestampEnd = uint64(ts)
	} else {
		return nil, fmt.Errorf("timestampEnd is required")
	}

	if val, ok := params["q"]; ok {
		res.Query = val[0]
	}

	if val, ok := params["groupBy"]; ok {
		res.GroupBy = val[0]
	}

	if val, ok := params["function"]; ok {
		res.Function = val[0]
	}

	if val, ok := params["step"]; ok {
		step, err := strconv.Atoi(val[0])
		if err != nil {
			return nil, err
		}
		res.StepSeconds = step
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
			searchCol := operatorRemovedTokens[0]
			if strings.ToLower(searchCol) == AND || strings.ToLower(searchCol) == OR {
				searchCol = operatorRemovedTokens[1]
			}
			col := searchCol
			if strings.ToLower(searchCol) == "fulltext" {
				col = "body"
			}

			f := fmt.Sprintf(`%s %s '%%%s%%' `, col, operatorMapping[opLower], searchString[1:len(searchString)-1])
			if strings.HasPrefix(strings.ToLower(v), AND) {
				f = "AND " + f
			} else if strings.HasPrefix(strings.ToLower(v), OR) {
				f = "OR " + f
			}
			sqlQueryTokens = append(sqlQueryTokens, f)
		} else {
			symbol := operatorMapping[strings.ToLower(op)]
			if symbol != "" {
				sqlExpr := strings.Replace(v, " "+op+" ", " "+symbol+" ", 1)
				splittedExpr := strings.Split(sqlExpr, symbol)
				if len(splittedExpr) != 2 {
					return nil, fmt.Errorf("error while splitting expression: %s", sqlExpr)
				}
				trimmedSqlExpr := fmt.Sprintf("%s %s %s ", strings.Join(strings.Fields(splittedExpr[0]), " "), symbol, strings.TrimSpace(splittedExpr[1]))
				sqlQueryTokens = append(sqlQueryTokens, trimmedSqlExpr)
			} else {
				// for exists|nexists don't process it here since we don't have metadata
				sqlQueryTokens = append(sqlQueryTokens, v)
			}
		}
	}

	return sqlQueryTokens, nil
}

func parseColumn(s string) (*string, error) {
	colName := ""

	// if has and/or as prefix
	filter := strings.Split(s, " ")

	first := strings.ToLower(filter[0])
	if first == AND || first == OR {
		colName = filter[1]
	} else {
		colName = filter[0]
	}

	return &colName, nil
}

func arrayToMap(fields []model.Field) map[string]model.Field {
	res := map[string]model.Field{}
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
		result, err := replaceFieldInToken(queryTokens[index], selectedFieldsLookup, interestingFieldLookup)
		if err != nil {
			return nil, err
		}
		queryTokens[index] = result
	}
	return queryTokens, nil
}

func replaceFieldInToken(queryToken string, selectedFieldsLookup map[string]model.Field, interestingFieldLookup map[string]model.Field) (string, error) {
	op := strings.TrimSpace(operatorRegex.FindString(queryToken))
	opLower := strings.ToLower(op)

	col, err := parseColumn(queryToken)
	if err != nil {
		return "", err
	}

	sqlColName := *col
	lowerColName := strings.ToLower(*col)

	if opLower == "exists" || opLower == "nexists" {
		var result string

		// handle static fields which are columns, timestamp and id is not required but added them regardless
		defaultValue := ""
		if lowerColName == "trace_id" || lowerColName == "span_id" || lowerColName == "severity_text" || lowerColName == "id" {
			defaultValue = "''"
		}
		if lowerColName == "trace_flags" || lowerColName == "severity_number" || lowerColName == "timestamp" {
			defaultValue = "0"
		}

		if defaultValue != "" {
			if opLower == "exists" {
				result = fmt.Sprintf("%s != %s", sqlColName, defaultValue)
			} else {
				result = fmt.Sprintf("%s = %s", sqlColName, defaultValue)
			}
		} else {
			// creating the query token here as we have the metadata
			field := model.Field{}

			if sfield, ok := selectedFieldsLookup[sqlColName]; ok {
				field = sfield
			} else if ifield, ok := interestingFieldLookup[sqlColName]; ok {
				field = ifield
			}
			result = fmt.Sprintf("has(%s_%s_key, '%s')", field.Type, strings.ToLower(field.DataType), field.Name)
			if opLower == "nexists" {
				result = "NOT " + result
			}
		}
		return strings.Replace(queryToken, sqlColName+" "+op, result, 1), nil
	}

	if lowerColName != "body" {
		if _, ok := selectedFieldsLookup[sqlColName]; !ok {
			if field, ok := interestingFieldLookup[sqlColName]; ok {
				if field.Type != constants.Static {
					sqlColName = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", field.Type, strings.ToLower(field.DataType), field.Type, strings.ToLower(field.DataType), field.Name)
				}
			} else if strings.Compare(strings.ToLower(*col), "fulltext") != 0 && field.Type != constants.Static {
				return "", fmt.Errorf("field not found for filtering")
			}
		} else {
			field := selectedFieldsLookup[sqlColName]
			if field.Type != constants.Static {
				sqlColName = utils.GetClickhouseColumnName(field.Type, field.DataType, field.Name)
			}
		}
	}
	return strings.Replace(queryToken, *col, sqlColName, 1), nil
}

func CheckIfPrevousPaginateAndModifyOrder(params *model.LogsFilterParams) (isPaginatePrevious bool) {
	if params.IdGt != "" && params.OrderBy == TIMESTAMP && params.Order == DESC {
		isPaginatePrevious = true
		params.Order = ASC
	} else if params.IdLT != "" && params.OrderBy == TIMESTAMP && params.Order == ASC {
		isPaginatePrevious = true
		params.Order = DESC
	}
	return
}

func GenerateSQLWhere(allFields *model.GetFieldsResponse, params *model.LogsFilterParams) (string, int, error) {
	var tokens []string
	var err error
	var sqlWhere string
	var lenTokens = 0
	if params.Query != "" {
		tokens, err = parseLogQuery(params.Query)

		if err != nil {
			return sqlWhere, -1, err
		}
		lenTokens = len(tokens)
	}

	tokens, err = replaceInterestingFields(allFields, tokens)
	if err != nil {
		return sqlWhere, -1, err
	}

	filterTokens := []string{}
	if params.TimestampStart != 0 {
		filter := fmt.Sprintf("timestamp >= '%d' ", params.TimestampStart)
		if len(filterTokens) > 0 {
			filter = "and " + filter
		}
		filterTokens = append(filterTokens, filter)
	}
	if params.TimestampEnd != 0 {
		filter := fmt.Sprintf("timestamp <= '%d' ", params.TimestampEnd)
		if len(filterTokens) > 0 {
			filter = "and " + filter
		}
		filterTokens = append(filterTokens, filter)
	}
	if params.IdGt != "" {
		filter := fmt.Sprintf("id > '%v' ", params.IdGt)
		if len(filterTokens) > 0 {
			filter = "and " + filter
		}
		filterTokens = append(filterTokens, filter)
	}
	if params.IdLT != "" {
		filter := fmt.Sprintf("id < '%v' ", params.IdLT)
		if len(filterTokens) > 0 {
			filter = "and " + filter
		}
		filterTokens = append(filterTokens, filter)
	}

	lenFilterTokens := len(filterTokens)
	if lenFilterTokens > 0 {
		// add parenthesis
		filterTokens[0] = fmt.Sprintf("( %s", filterTokens[0])
		filterTokens[lenFilterTokens-1] = fmt.Sprintf("%s) ", filterTokens[lenFilterTokens-1])

		lenTokens := len(tokens)
		if lenTokens > 0 {
			tokens[0] = fmt.Sprintf("and ( %s", tokens[0])
			tokens[lenTokens-1] = fmt.Sprintf("%s) ", tokens[lenTokens-1])
		}
		filterTokens = append(filterTokens, tokens...)
		tokens = filterTokens
	}

	sqlWhere = strings.Join(tokens, "")

	return sqlWhere, lenTokens, nil
}
