package constants

import (
	"os"
	"testing"
	"time"

	. "github.com/smartystreets/goconvey/convey"
)

func TestGetAlertManagerApiPrefix(t *testing.T) {
	Convey("TestGetAlertManagerApiPrefix", t, func() {
		res := GetAlertManagerApiPrefix()
		So(res, ShouldEqual, "http://alertmanager:9093/api/")

		Convey("WithEnvSet", func() {
			os.Setenv("ALERTMANAGER_API_PREFIX", "http://test:9093/api/")
			res = GetAlertManagerApiPrefix()
			So(res, ShouldEqual, "http://test:9093/api/")
		})
	})
}

func TestGetContextTimeout(t *testing.T) {
	Convey("TestGetContextTimeout", t, func() {
		res := GetContextTimeout()
		So(res, ShouldEqual, time.Duration(60000000000))

		Convey("WithEnvSet", func() {
			os.Setenv("CONTEXT_TIMEOUT", "120")
			res = GetContextTimeout()
			So(res, ShouldEqual, time.Duration(120000000000))
		})
	})
}
