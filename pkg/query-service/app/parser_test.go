package app

import (
	"bytes"
	"net/http"
	"testing"

	"github.com/smartystreets/assertions/should"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/query-service/app/metrics"
	"go.signoz.io/query-service/model"
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
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(query, ShouldContainSubstring, "signoz_metrics.time_series_v2 WHERE metric_name = 'table' AND labels_object.namespace = 'a'")
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
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(query, should.ContainSubstring, "labels_object.host IN ['host-1','host-2']")
		So(query, should.ContainSubstring, "labels_object.namespace = 'a'")
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
		_, err := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(err, should.BeError, "unsupported operation")
	})
}
