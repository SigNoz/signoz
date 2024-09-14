package utils

const HOUR_NANO = int64(3600000000000)

type LogsListTsRange struct {
	Start int64
	End   int64
}

func GetLogsListTsRanges(start, end int64) []LogsListTsRange {
	startNano := GetEpochNanoSecs(start)
	endNano := GetEpochNanoSecs(end)
	result := []LogsListTsRange{}

	if endNano-startNano > HOUR_NANO {
		bucket := HOUR_NANO
		tStartNano := endNano - bucket

		complete := false
		for {
			result = append(result, LogsListTsRange{Start: tStartNano, End: endNano})
			if complete {
				break
			}

			bucket = bucket * 2
			endNano = tStartNano
			tStartNano = tStartNano - bucket

			// break condition
			if tStartNano <= startNano {
				complete = true
				tStartNano = startNano
			}
		}
	}
	return result
}
