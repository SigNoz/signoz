package logs

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/query-service/model"
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
		`filters with lt,gt,lte,gte operators`,
		`id lt 100 and id gt 50 and code lte 500 and code gte 400`,
		[]string{`id < 100 `, `and id > 50 `, `and code <= 500 `, `and code >= 400 `},
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

func TestGenerateSQLQuery(t *testing.T) {
	allFields := model.GetFieldsResponse{
		Selected: []model.LogField{
			{
				Name:     "id",
				DataType: "int64",
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

	query := "id lt 100 and id gt 50 and code lte 500 and code gte 400"
	tsStart := uint64(1657689292000)
	tsEnd := uint64(1657689294000)
	idStart := "2BsKLKv8cZrLCn6rkOcRGkdjBdM"
	idEnd := "2BsKG6tRpFWjYMcWsAGKfSxoQdU"
	sqlWhere := "id < 100 and id > 50 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] <= 500 and attributes_int64_value[indexOf(attributes_int64_key, 'code')] >= 400 and timestamp >= '1657689292000' and timestamp <= '1657689294000' and id > '2BsKLKv8cZrLCn6rkOcRGkdjBdM' and id < '2BsKG6tRpFWjYMcWsAGKfSxoQdU' "
	Convey("testInterestingFields", t, func() {
		res, _ := GenerateSQLWhere(&allFields, &model.LogsFilterParams{Query: &query, TimestampStart: &tsStart, TimestampEnd: &tsEnd, IdStart: &idStart, IdEnd: &idEnd})
		So(*res, ShouldEqual, sqlWhere)
	})
}
