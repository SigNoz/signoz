package logparsingpipeline

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// Regex for strptime format placeholders supported by the time parser.
// Used for defining if conditions on time parsing operators so they do not
// spam collector logs when encountering values that can't be parsed.
//
// Based on ctimeSubstitutes defined in https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/internal/coreinternal/timeutils/internal/ctimefmt/ctimefmt.go#L22
//
// TODO(Raj): Maybe make the expressions tighter.
var ctimeRegex = map[string]string{
	//	%Y - Year, zero-padded (0001, 0002, ..., 2019, 2020, ..., 9999)
	"%Y": "[0-9]{4}",
	//	%y - Year, last two digits, zero-padded (01, ..., 99)
	"%y": "[0-9]{2}",
	//	%m - Month as a decimal number (01, 02, ..., 12)
	"%m": "[0-9]{2}",
	//	%o - Month as a space-padded number ( 1, 2, ..., 12)
	"%o": "_[0-9]",
	//	%q - Month as a unpadded number (1,2,...,12)
	"%q": "[0-9]",
	//	%b, %h - Abbreviated month name (Jan, Feb, ...)
	"%b": "[a-zA-Z]*?",
	"%h": "[a-zA-Z]*?",
	//	%B - Full month name (January, February, ...)
	"%B": "[a-zA-Z]*?",
	//	%d - Day of the month, zero-padded (01, 02, ..., 31)
	"%d": "[0-9]{2}",
	//	%e - Day of the month, space-padded ( 1, 2, ..., 31)
	"%e": "_[0-9]",
	//	%g - Day of the month, unpadded (1,2,...,31)
	"%g": "[0-9]",
	//	%a - Abbreviated weekday name (Sun, Mon, ...)
	"%a": "[a-zA-Z]*?",
	//	%A - Full weekday name (Sunday, Monday, ...)
	"%A": "[a-zA-Z]*?",
	//	%H - Hour (24-hour clock) as a zero-padded decimal number (00, ..., 24)
	"%H": "[0-9]{2}",
	//	%l - Hour (12-hour clock: 0, ..., 12)
	"%l": "[0-9]{1-2}",
	//	%I - Hour (12-hour clock) as a zero-padded decimal number (00, ..., 12)
	"%I": "[0-9]{2}",
	//	%p - Locale’s equivalent of either AM or PM
	"%p": "(AM|PM)",
	//	%P - Locale’s equivalent of either am or pm
	"%P": "(am|pm)",
	//	%M - Minute, zero-padded (00, 01, ..., 59)
	"%M": "[0-9]{2}",
	//	%S - Second as a zero-padded decimal number (00, 01, ..., 59)
	"%S": "[0-9]{2}",
	//	%L - Millisecond as a decimal number, zero-padded on the left (000, 001, ..., 999)
	"%L": "[0-9]*?",
	//	%f - Microsecond as a decimal number, zero-padded on the left (000000, ..., 999999)
	"%f": "[0-9]*?",
	//	%s - Nanosecond as a decimal number, zero-padded on the left (000000, ..., 999999)
	"%s": "[0-9]*?",
	//	%Z - Timezone name or abbreviation or empty (UTC, EST, CST)
	"%Z": "[a-zA-Z]*?",
	//	%z - UTC offset in the form ±HHMM[SS[.ffffff]] or empty(+0000, -0400)
	"%z": "[-+][0-9]*?",
	// Weekday as a decimal number, where 0 is Sunday and 6 is Saturday.
	"%w": "[-+][0-9]*?",
	"%i": "[-+][0-9]*?",
	"%j": "[-+][0-9]{2}:[0-9]{2}",
	"%k": "[-+][0-9]{2}:[0-9]{2}:[0-9]{2}",
	//	%D, %x - Short MM/DD/YY date, equivalent to %m/%d/%y
	"%D": "[0-9]{2}/[0-9]{2}/[0-9]{4}",
	//	%D, %x - Short MM/DD/YY date, equivalent to %m/%d/%y
	"%x": "[0-9]{2}/[0-9]{2}/[0-9]{4}",
	//	%F - Short YYYY-MM-DD date, equivalent to %Y-%m-%d
	"%F": "[0-9]{4}-[0-9]{2}-[0-9]{2}",
	//	%T, %X - ISO 8601 time format (HH:MM:SS), equivalent to %H:%M:%S
	"%T": "[0-9]{2}:[0-9]{2}:[0-9]{2}",
	//	%T, %X - ISO 8601 time format (HH:MM:SS), equivalent to %H:%M:%S
	"%X": "[0-9]{2}:[0-9]{2}:[0-9]{2}",
	//	%r - 12-hour clock time (02:55:02 pm)
	"%r": "[0-9]{2}:[0-9]{2}:[0-9]{2} (am|pm)",
	//	%R - 24-hour HH:MM time, equivalent to %H:%M
	"%R": "[0-9]{2}:[0-9]{2}",
	//	%n - New-line character ('\n')
	"%n": "\n",
	//	%t - Horizontal-tab character ('\t')
	"%t": "\t",
	//	%% - A % sign
	"%%": "%",
	//	%c - Date and time representation (Mon Jan 02 15:04:05 2006)
	"%c": "[a-zA-Z]{3} [a-zA-Z]{3} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} [0-9]{4}",
}

func RegexForStrptimeLayout(layout string) (string, error) {
	layoutRegex := layout
	for _, regexSpecialChar := range []string{
		".", "+", "*", "?", "^", "$", "(", ")", "[", "]", "{", "}", "|", `\`,
	} {
		layoutRegex = strings.ReplaceAll(layoutRegex, regexSpecialChar, `\`+regexSpecialChar)
	}

	var errs []error
	replaceStrptimeDirectiveWithRegex := func(directive string) string {
		if regex, ok := ctimeRegex[directive]; ok {
			return regex
		}
		errs = append(errs, errors.New("unsupported ctimefmt directive: "+directive))
		return ""
	}

	strptimeDirectiveRegexp := regexp.MustCompile(`%.`)
	layoutRegex = strptimeDirectiveRegexp.ReplaceAllStringFunc(layoutRegex, replaceStrptimeDirectiveWithRegex)
	if len(errs) != 0 {
		return "", fmt.Errorf("couldn't generate regex for ctime format: %v", errs)
	}

	return layoutRegex, nil
}
