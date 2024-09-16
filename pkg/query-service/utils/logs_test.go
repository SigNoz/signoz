package utils

import "testing"

func TestLogsListTsRange(t *testing.T) {
	startEndData := []struct {
		name  string
		start int64
		end   int64
		res   []LogsListTsRange
	}{
		{
			name:  "testing for less then one hour",
			start: 1722262800000000000, // July 29, 2024 7:50:00 PM
			end:   1722263800000000000, // July 29, 2024 8:06:40 PM
			res:   []LogsListTsRange{},
		},
		{
			name:  "testing for more than one hour",
			start: 1722255800000000000, // July 29, 2024 5:53:20 PM
			end:   1722262800000000000, // July 29, 2024 8:06:40 PM
			res: []LogsListTsRange{
				{1722259200000000000, 1722262800000000000}, // July 29, 2024 6:50:00 PM - July 29, 2024 7:50:00 PM
				{1722255800000000000, 1722259200000000000}, // July 29, 2024 5:53:20 PM - July 29, 2024 6:50:00 PM
			},
		},
		{
			name:  "testing for 1 day",
			start: 1722171576000000000,
			end:   1722262800000000000,
			res: []LogsListTsRange{
				{1722259200000000000, 1722262800000000000}, //  July 29, 2024 6:50:00 PM - July 29, 2024 7:50:00 PM
				{1722252000000000000, 1722259200000000000}, //  July 29, 2024 4:50:00 PM - July 29, 2024 6:50:00 PM
				{1722237600000000000, 1722252000000000000}, //  July 29, 2024 12:50:00 PM - July 29, 2024 4:50:00 PM
				{1722208800000000000, 1722237600000000000}, //  July 29, 2024 4:50:00 AM - July 29, 2024 12:50:00 PM
				{1722171576000000000, 1722208800000000000}, //  July 28, 2024 6:29:36 PM - July 29, 2024 4:50:00 AM
			},
		},
	}

	for _, test := range startEndData {
		res := GetLogsListTsRanges(test.start, test.end)
		for i, v := range res {
			if test.res[i].Start != v.Start || test.res[i].End != v.End {
				t.Errorf("expected range was %v - %v, got %v - %v", v.Start, v.End, test.res[i].Start, test.res[i].End)
			}
		}
	}
}
