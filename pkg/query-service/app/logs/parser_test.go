package logs

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var correctQueriesTest = []struct {
	Name          string
	InputQuery    string
	WantSqlTokens []string
}{
	{
		`filter with fulltext`,
		`OPERATION in ('bcd') AND FULLTEXT contains 'searchstring'`,
		[]string{`OPERATION IN ('bcd') `, `AND body ILIKE '%searchstring%' `},
	},
	{
		`fulltext`,
		`searchstring`,
		[]string{`body ILIKE '%searchstring%' `},
	},
	{
		`fulltext with quotes and space`,
		`FULLTEXT contains 'Hello, "World"'`,
		[]string{`body ILIKE '%Hello, "World"%' `},
	},
	{
		`contains search with a different attributes`,
		`resource contains 'Hello, "World" and user\'s'`,
		[]string{`resource ILIKE '%Hello, "World" and user\'s%' `},
	},
	{
		`more than one continas`,
		`resource contains 'Hello, "World"' and myresource contains 'abcd'`,
		[]string{`resource ILIKE '%Hello, "World"%' `, `AND myresource ILIKE '%abcd%' `},
	},
	{
		"contains with or",
		`id in ('2CkBCauK8m3nkyKR19YhCw6WbdY') or fulltext contains 'OPTIONS /api/v1/logs'`,
		[]string{`id IN ('2CkBCauK8m3nkyKR19YhCw6WbdY') `, `OR body ILIKE '%OPTIONS /api/v1/logs%' `},
	},
	{
		"mixing and or",
		`id in ('2CkBCauK8m3nkyKR19YhCw6WbdY') and id in ('2CkBCauK8m3nkyKR19YhCw6WbdY','2CkBCauK8m3nkyKR19YhCw6WbdY') or fulltext contains 'OPTIONS /api/v1/logs'`,
		[]string{`id IN ('2CkBCauK8m3nkyKR19YhCw6WbdY') `, `and id IN ('2CkBCauK8m3nkyKR19YhCw6WbdY','2CkBCauK8m3nkyKR19YhCw6WbdY') `, `OR body ILIKE '%OPTIONS /api/v1/logs%' `},
	},
	{
		`filters with lt,gt,lte,gte operators`,
		`id lt 100 and id gt 50 and code lte 500 and code gte 400`,
		[]string{`id < 100 `, `and id > 50 `, `and code <= 500 `, `and code >= 400 `},
	},
	{
		`filters with lt,gt,lte,gte operators seprated by OR`,
		`id lt 100 or id gt 50 or code lte 500 or code gte 400`,
		[]string{`id < 100 `, `or id > 50 `, `or code <= 500 `, `or code >= 400 `},
	},
	{
		`filter with number`,
		`status gte 200 AND FULLTEXT ncontains '"key"'`,
		[]string{`status >= 200 `, `AND body NOT ILIKE '%"key"%' `},
	},
	{
		`characters inside string`,
		`service NIN ('name > 100') AND length gt 100`,
		[]string{`service NOT IN ('name > 100') `, `AND length > 100 `},
	},
	{
		`fulltext with in`,
		`key in 2`,
		[]string{`body ILIKE '%key in 2%' `},
	},
	{
		`not valid fulltext but a filter`,
		`key in (2,3)`,
		[]string{`key IN (2,3) `},
	},
	{
		`filters with extra spaces`,
		`service IN ('name > 100')    AND   length gt 100`,
		[]string{`service IN ('name > 100') `, `AND   length > 100 `},
	},
	{
		`filters with special characters in key name`,
		`id.userid in (100) and id_userid gt 50`,
		[]string{`id.userid IN (100) `, `and id_userid > 50 `},
	},
}

func TestParseLogQueryCorrect(t *testing.T) {
	for _, test := range correctQueriesTest {
		Convey(test.Name, t, func() {
			query, _ := parseLogQuery(test.InputQuery)

			So(query, ShouldResemble, test.WantSqlTokens)
		})
	}
}

var incorrectQueries = []struct {
	Name  string
	Query string
}{
	{
		"filter without a key",
		"OPERATION in ('bcd') AND 'abcd' FULLTEXT contains 'helloxyz'",
	},
	{
		"fulltext without fulltext keyword",
		"OPERATION in ('bcd') AND 'searchstring'",
	},
	{
		"fulltext in the beginning without keyword",
		"'searchstring and OPERATION in ('bcd')",
	},
}

func TestParseLogQueryInCorrect(t *testing.T) {
	for _, test := range incorrectQueries {
		Convey(test.Name, t, func() {
			_, err := parseLogQuery(test.Query)
			So(err, ShouldBeError)
		})
	}
}

var parseCorrectColumns = []struct {
	Name   string
	Filter string
	Column string
}{
	{
		"column with IN operator",
		"id.userid IN (100) ",
		"id.userid",
	},
	{
		"column with NOT IN operator",
		"service NOT IN ('name > 100') ",
		"service",
	},
	{
		"column with > operator",
		"and id_userid > 50 ",
		"id_userid",
	},
	{
		"column with < operator",
		"and id_userid < 50 ",
		"id_userid",
	},
	{
		"column with <= operator",
		"and id_userid <= 50 ",
		"id_userid",
	},
	{
		"column with >= operator",
		"and id_userid >= 50 ",
		"id_userid",
	},
	{
		"column starting with and",
		"andor = 1",
		"andor",
	},
	{
		"column starting with and after an 'and'",
		"and andor = 1",
		"andor",
	},
	{
		"column starting with And",
		"Andor = 1",
		"Andor",
	},
	{
		"column starting with and after an 'and'",
		"and Andor = 1",
		"Andor",
	},
	{
		"column with ilike",
		`AND body ILIKE '%searchstring%' `,
		"body",
	},
	{
		"column with not ilike",
		`AND body ILIKE '%searchstring%' `,
		"body",
	},
}

func TestParseColumn(t *testing.T) {
	for _, test := range parseCorrectColumns {
		Convey(test.Name, t, func() {
			column, _ := parseColumn(test.Filter)
			So(*column, ShouldEqual, test.Column)
		})
	}
}

func TestReplaceInterestingFields(t *testing.T) {
	queryTokens := []string{"id.userid IN (100) ", "and id_key >= 50 ", `AND body ILIKE '%searchstring%'`}
	allFields := model.GetFieldsResponse{
		Selected: []model.LogField{
			model.LogField{
				Name:     "id_key",
				DataType: "int64",
				Type:     "attributes",
			},
		},
		Interesting: []model.LogField{
			model.LogField{
				Name:     "id.userid",
				DataType: "int64",
				Type:     "attributes",
			},
		},
	}

	expectedTokens := []string{"attributes_int64_value[indexOf(attributes_int64_key, 'id.userid')] IN (100) ", "and id_key >= 50 ", `AND body ILIKE '%searchstring%'`}
	Convey("testInterestingFields", t, func() {
		tokens, _ := replaceInterestingFields(&allFields, queryTokens)
		So(tokens, ShouldResemble, expectedTokens)
	})
}

var previousPaginateTestCases = []struct {
	Name           string
	Filter         model.LogsFilterParams
	IsPaginatePrev bool
	Order          string
}{
	{
		Name:           "empty",
		Filter:         model.LogsFilterParams{},
		IsPaginatePrev: false,
	},
	{
		Name: "next ordery by asc",
		Filter: model.LogsFilterParams{
			OrderBy: TIMESTAMP,
			Order:   ASC,
			IdGt:    "myid",
		},
		IsPaginatePrev: false,
		Order:          ASC,
	},
	{
		Name: "next ordery by desc",
		Filter: model.LogsFilterParams{
			OrderBy: TIMESTAMP,
			Order:   DESC,
			IdLT:    "myid",
		},
		IsPaginatePrev: false,
		Order:          DESC,
	},
	{
		Name: "prev ordery by desc",
		Filter: model.LogsFilterParams{
			OrderBy: TIMESTAMP,
			Order:   DESC,
			IdGt:    "myid",
		},
		IsPaginatePrev: true,
		Order:          ASC,
	},
	{
		Name: "prev ordery by asc",
		Filter: model.LogsFilterParams{
			OrderBy: TIMESTAMP,
			Order:   ASC,
			IdLT:    "myid",
		},
		IsPaginatePrev: true,
		Order:          DESC,
	},
}

func TestCheckIfPrevousPaginateAndModifyOrder(t *testing.T) {
	for _, test := range previousPaginateTestCases {
		Convey(test.Name, t, func() {
			isPrevPaginate := CheckIfPrevousPaginateAndModifyOrder(&test.Filter)
			So(isPrevPaginate, ShouldEqual, test.IsPaginatePrev)
			So(test.Order, ShouldEqual, test.Filter.Order)
		})
	}
}

var generateSQLQueryFields = model.GetFieldsResponse{
	Selected: []model.LogField{
		{
			Name:     "field1",
			DataType: "int64",
			Type:     "attributes",
		},
		{
			Name:     "field2",
			DataType: "double64",
			Type:     "attributes",
		},
		{
			Name:     "field2",
			DataType: "string",
			Type:     "attributes",
		},
	},
	Interesting: []model.LogField{
		{
			Name:     "code",
			DataType: "int64",
			Type:     "attributes",
		},
	},
}

var generateSQLQueryTestCases = []struct {
	Name      string
	Filter    model.LogsFilterParams
	SqlFilter string
}{
	{
		Name: "first query with more than 1 compulsory filters",
		Filter: model.LogsFilterParams{
			Query:          "field1 lt 100 and field1 gt 50 and code lte 500 and code gte 400",
			TimestampStart: uint64(1657689292000),
			TimestampEnd:   uint64(1657689294000),
			IdGt:           "2BsKLKv8cZrLCn6rkOcRGkdjBdM",
			IdLT:           "2BsKG6tRpFWjYMcWsAGKfSxoQdU",
		},
		SqlFilter: "( timestamp >= '1657689292000' and timestamp <= '1657689294000' and id > '2BsKLKv8cZrLCn6rkOcRGkdjBdM' and id < '2BsKG6tRpFWjYMcWsAGKfSxoQdU' ) and ( field1 < 100 and field1 > 50 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] <= 500 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] >= 400 ) ",
	},
	{
		Name: "second query with only timestamp range",
		Filter: model.LogsFilterParams{
			Query:          "field1 lt 100 and field1 gt 50 and code lte 500 and code gte 400",
			TimestampStart: uint64(1657689292000),
			TimestampEnd:   uint64(1657689294000),
		},
		SqlFilter: "( timestamp >= '1657689292000' and timestamp <= '1657689294000' ) and ( field1 < 100 and field1 > 50 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] <= 500 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] >= 400 ) ",
	},
}

func TestGenerateSQLQuery(t *testing.T) {
	for _, test := range generateSQLQueryTestCases {
		Convey("testGenerateSQL", t, func() {
			res, _ := GenerateSQLWhere(&generateSQLQueryFields, &test.Filter)
			So(res, ShouldEqual, test.SqlFilter)
		})
	}
}

func TestGenerateSQLQueryCaseSensitivity(t *testing.T) {
	allFields := model.GetFieldsResponse{
		Selected: []model.LogField{
			{
				Name:     "OtherField",
				DataType: "int64",
				Type:     "attributes",
			},
		},
		Interesting: []model.LogField{
			{
				Name:     "Code",
				DataType: "int64",
				Type:     "attributes",
			},
		},
	}

	query := "otherfield lt 100 and otherField gt 50 AND Code lte 500 and code gte 400"
	tsStart := uint64(1657689292000)
	tsEnd := uint64(1657689294000)
	idStart := "2BsKLKv8cZrLCn6rkOcRGkdjBdM"
	idEnd := "2BsKG6tRpFWjYMcWsAGKfSxoQdU"
	sqlWhere := "timestamp >= '1657689292000' and timestamp <= '1657689294000' and id > '2BsKLKv8cZrLCn6rkOcRGkdjBdM' and id < '2BsKG6tRpFWjYMcWsAGKfSxoQdU' and OtherField < 100 and OtherField > 50 AND attributes_int64_value[indexOf(attributes_int64_key, 'Code')] <= 500 and attributes_int64_value[indexOf(attributes_int64_key, 'Code')] >= 400 "
	Convey("TestGenerateSQLQueryCaseSensitivity", t, func() {
		res, _ := GenerateSQLWhere(&allFields, &model.LogsFilterParams{Query: query, TimestampStart: tsStart, TimestampEnd: tsEnd, IdGt: idStart, IdLT: idEnd})
		So(res, ShouldEqual, sqlWhere)
	})
}
