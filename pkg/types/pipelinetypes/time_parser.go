package pipelinetypes

import (
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// Regex for strptime format placeholders supported by the time parser.
// Used for defining if conditions on time parsing operators so they do not
// spam collector logs when encountering values that can't be parsed.
//
// Based on ctimeSubstitutes defined in https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/internal/coreinternal/timeutils/internal/ctimefmt/ctimefmt.go#L22
var ctimeRegex = map[string]string{
	//	%Y - Year, zero-padded (0001, 0002, ..., 2019, 2020, ..., 9999)
	"%Y": "[0-9]{4}",
	//	%y - Year, last two digits, zero-padded (01, ..., 99)
	"%y": "[0-9]{2}",
	//	%m - Month as a decimal number (01, 02, ..., 12)
	"%m": "(0[1-9]|1[0-2])",
	//	%o - Month prefixed by an underscore (_1, _2, ..., _12),
	//	matching the collector's _1 Go layout
	"%o": "_([1-9]|1[0-2])",
	//	%q - Month as a unpadded number (1,2,...,12)
	"%q": "([1-9]|1[0-2])",
	//	%b, %h - Abbreviated month name (Jan, Feb, ...)
	"%b": "(?i:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)",
	"%h": "(?i:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)",
	//	%B - Full month name (January, February, ...)
	"%B": "(?i:January|February|March|April|May|June|July|August|September|October|November|December)",
	//	%d - Day of the month, zero-padded (01, 02, ..., 31)
	"%d": "(0[1-9]|[12][0-9]|3[01])",
	//	%e - Day of the month, space-padded ( 1, 2, ..., 31)
	"%e": "( [1-9]|[12][0-9]|3[01])",
	//	%g - Day of the month, unpadded (1,2,...,31)
	"%g": "([1-9]|[12][0-9]|3[01])",
	//	%a - Abbreviated weekday name (Sun, Mon, ...)
	"%a": "(?i:Sun|Mon|Tue|Wed|Thu|Fri|Sat)",
	//	%A - Full weekday name (Sunday, Monday, ...)
	"%A": "(?i:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)",
	//	%H - Hour (24-hour clock) as a zero-padded decimal number (00, ..., 23)
	"%H": "([01][0-9]|2[0-3])",
	//	%l - Hour (12-hour clock: 0, ..., 12)
	"%l": "([0-9]|1[0-2])",
	//	%I - Hour (12-hour clock) as a zero-padded decimal number (00, ..., 12)
	"%I": "(0[0-9]|1[0-2])",
	//	%p - Locale’s equivalent of either AM or PM
	"%p": "(AM|PM)",
	//	%P - Locale’s equivalent of either am or pm
	"%P": "(am|pm)",
	//	%M - Minute, zero-padded (00, 01, ..., 59)
	"%M": "[0-5][0-9]",
	//	%S - Second as a zero-padded decimal number (00, 01, ..., 59)
	"%S": "[0-5][0-9]",
	//	%L - Millisecond as a decimal number, zero-padded on the left (000, 001, ..., 999)
	"%L": "[0-9]{3}",
	//	%f - Microsecond as a decimal number, zero-padded on the left (000000, ..., 999999)
	"%f": "[0-9]{6}",
	//	%s - Fractional second as eight decimal digits (00000000, ..., 99999999)
	"%s": "[0-9]{8}",
	//	%Z - Timezone name or abbreviation (UTC, EST, CST)
	"%Z": "(GMT([+-]([1-9]|1[0-9]|2[0-3]))?|ChST|MeST|WITA|[A-Z]{3}|[A-Z]{3}T|[A-Z]{4}T)",
	//	%z - UTC offset in the form Z or ±HHMM (Z, +0000, -0400)
	"%z": "(Z|[+-]([01][0-9]|2[0-4])([0-5][0-9]|60))",
	// Numeric UTC offsets matching the collector's -070000, -07, -07:00, and -07:00:00 Go layouts.
	"%w": "[+-]([01][0-9]|2[0-4])([0-5][0-9]|60)([0-5][0-9]|60)",
	"%i": "[+-]([01][0-9]|2[0-4])",
	"%j": "[+-]([01][0-9]|2[0-4]):([0-5][0-9]|60)",
	"%k": "[+-]([01][0-9]|2[0-4]):([0-5][0-9]|60):([0-5][0-9]|60)",
	//	%D, %x - Short MM/DD/YYYY date
	"%D": "(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/[0-9]{4}",
	//	%D, %x - Short MM/DD/YYYY date
	"%x": "(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/[0-9]{4}",
	//	%F - Short YYYY-MM-DD date, equivalent to %Y-%m-%d
	"%F": "[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])",
	//	%T, %X - ISO 8601 time format (HH:MM:SS), equivalent to %H:%M:%S
	"%T": "([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]",
	//	%T, %X - ISO 8601 time format (HH:MM:SS), equivalent to %H:%M:%S
	"%X": "([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]",
	//	%r - 12-hour clock time (02:55:02 pm)
	"%r": "(0[0-9]|1[0-2]):[0-5][0-9]:[0-5][0-9] (am|pm)",
	//	%R - 24-hour HH:MM time, equivalent to %H:%M
	"%R": "([01][0-9]|2[0-3]):[0-5][0-9]",
	//	%n - New-line character ('\n')
	"%n": "\n",
	//	%t - Horizontal-tab character ('\t')
	"%t": "\t",
	//	%% - A % sign
	"%%": "%",
	//	%c - Date and time representation (Mon Jan 02 15:04:05 2006)
	"%c": "(?i:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?i:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (0[1-9]|[12][0-9]|3[01]) ([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9] [0-9]{4}",
}

func RegexForStrptimeLayout(layout string) (string, error) {
	var errs []error
	var layoutRegex strings.Builder
	layoutRegex.WriteString("^")

	for len(layout) > 0 {
		directiveIndex := strings.IndexByte(layout, '%')
		if directiveIndex == -1 {
			layoutRegex.WriteString(regexp.QuoteMeta(layout))
			break
		}

		layoutRegex.WriteString(regexp.QuoteMeta(layout[:directiveIndex]))
		if directiveIndex+1 >= len(layout) {
			errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incomplete ctimefmt directive: %"))
			break
		}

		directive := layout[directiveIndex : directiveIndex+2]
		directiveRegex, ok := ctimeRegex[directive]
		if !ok {
			errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "unsupported ctimefmt directive: "+directive))
		} else {
			layoutRegex.WriteString(directiveRegex)
		}
		layout = layout[directiveIndex+2:]
	}
	if len(errs) != 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "couldn't generate regex for ctime format: %v", errs)
	}

	layoutRegex.WriteString("$")
	generatedRegex := layoutRegex.String()
	if _, err := regexp.Compile(generatedRegex); err != nil {
		return "", errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "couldn't compile regex for ctime format")
	}

	return generatedRegex, nil
}
