package types

import (
	"crypto/rand"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
)

const GeneratedNameSuffixLen = 8

var cloneCopySuffixRegex = regexp.MustCompile(`^(.*) - Copy(?: \((\d+)\))?$`)

// GenerateName slugifies displayName into a DNS-1123 label and appends a random suffix; uniqueness is left to the caller's unique index.
func GenerateName(displayName string) string {
	const dns1123LabelMaxLen = 63
	suffixAlphabet := []byte("abcdefghijklmnopqrstuvwxyz0123456789")

	var b strings.Builder
	b.Grow(len(displayName))
	prevHyphen := false
	for _, r := range strings.ToLower(displayName) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevHyphen = false
		case b.Len() > 0 && !prevHyphen:
			b.WriteByte('-')
			prevHyphen = true
		}
	}
	prefix := strings.TrimRight(b.String(), "-")

	suffix := make([]byte, GeneratedNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(errors.WrapInternalf(err, errors.CodeInternal, "read random for generated name suffix"))
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - GeneratedNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
}

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
