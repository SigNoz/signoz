package types

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

var cloneCopySuffixRegex = regexp.MustCompile(`^(.*) - Copy(?: \((\d+)\))?$`)

// GenerateCloneName appends " - Copy" or bumps an existing " - Copy (n)" counter, truncating the base in runes to fit maxLen; maxLen 0 means no limit.
func GenerateCloneName(name string, maxLen int) string {
	base, count := name, 0
	if m := cloneCopySuffixRegex.FindStringSubmatch(name); m != nil {
		base = m[1]
		count = 1 // bare " - Copy"
		if m[2] != "" {
			count, _ = strconv.Atoi(m[2])
		}
	}

	suffix := " - Copy"
	if count++; count > 1 {
		suffix = fmt.Sprintf(" - Copy (%d)", count)
	}

	if maxLen > 0 {
		limit := max(maxLen-utf8.RuneCountInString(suffix), 0)
		if runes := []rune(base); len(runes) > limit {
			base = strings.TrimRight(string(runes[:limit]), " ")
		}
	}
	return base + suffix
}
