package utils

import (
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
)

var (
	sixHoursInMilliseconds = time.Hour.Milliseconds() * 6
	oneDayInMilliseconds   = time.Hour.Milliseconds() * 24
	oneWeekInMilliseconds  = oneDayInMilliseconds * 7
)

func WhichTSTableToUse(start, end int64) (int64, int64, string, string) {

	var tableName string
	var localTableName string
	if end-start < sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (time.Hour.Milliseconds() * 1))
		tableName = constants.SIGNOZ_TIMESERIES_v4_TABLENAME
		localTableName = constants.SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME
	} else if end-start < oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (time.Hour.Milliseconds() * 6))
		tableName = constants.SIGNOZ_TIMESERIES_v4_6HRS_TABLENAME
		localTableName = constants.SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME
	} else if end-start < oneWeekInMilliseconds {
		// adjust the start time to nearest 1 day
		start = start - (start % (time.Hour.Milliseconds() * 24))
		tableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME
		localTableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME
	} else {
		// adjust the start time to nearest 1 week
		start = start - (start % (time.Hour.Milliseconds() * 24 * 7))
		tableName = constants.SIGNOZ_TIMESERIES_v4_1WEEK_TABLENAME
		localTableName = constants.SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME
	}

	return start, end, tableName, localTableName
}

func WhichSampleTableToUse(start, end int64) (string, string) {
	if end-start < oneDayInMilliseconds {
		return constants.SIGNOZ_SAMPLES_V4_TABLENAME, "count(*)"
	} else if end-start < oneWeekInMilliseconds {
		return constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME, "sum(count)"
	} else {
		return constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME, "sum(count)"
	}
}

func WhichAttributesTableToUse(start, end int64) (int64, int64, string, string) {
	if end-start < sixHoursInMilliseconds {
		start = start - (start % (time.Hour.Milliseconds() * 6))
	}
	return start, end, constants.SIGNOZ_ATTRIBUTES_METADATA_TABLENAME, constants.SIGNOZ_ATTRIBUTES_METADATA_LOCAL_TABLENAME
}
