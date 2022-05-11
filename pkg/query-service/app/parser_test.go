package app

import (
	"bytes"
	"net/http"
	"testing"

	"github.com/smartystreets/assertions/should"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/query-service/app/metrics"
)

func TestParseFilterSingleFilter(t *testing.T) {
	Convey("TestParseFilterSingleFilter", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "EQ"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, "table")
		So(query, ShouldEqual, "SELECT fingerprint, labels FROM signoz_metrics.time_series WHERE JSONExtractString(table.labels,'namespace') = 'a'")
	})
}

func TestParseFilterMultipleFilter(t *testing.T) {
	Convey("TestParseFilterMultipleFilter", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "EQ"},
				{"key": "host", "value": ["host-1", "host-2"], "op": "IN"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, "table")
		So(query, should.ContainSubstring, "JSONExtractString(table.labels,'host') IN ['host-1','host-2']")
		So(query, should.ContainSubstring, "JSONExtractString(table.labels,'namespace') = 'a'")
	})
}

func TestParseFilterNotSupportedOp(t *testing.T) {
	Convey("TestParseFilterNotSupportedOp", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "PO"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		_, err := metrics.BuildMetricsTimeSeriesFilterQuery(res, "table")
		So(err, should.BeError, "unsupported operation")
	})
}
