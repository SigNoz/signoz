package dashboardtypes

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ══════════════════════════════════════════════
// Tags
// ══════════════════════════════════════════════

// v1 carries tags as a flat []string; v2 tags are (key, value) pairs. Each v1
// string is normalized into a pair (separator split, empty-side fallback,
// reserved-key prefix, `/` scrub). Tags that normalize to the same
// (lower(key), lower(value)) within a dashboard are collapsed, first occurrence
// winning the display casing.
//
// Characters still illegal after normalization (spaces, punctuation) are molded
// to fit the tag validators: disallowed runs collapse to "_" (see moldTagField).

// defaultV1TagKey is the key assigned when a v1 tag string has no usable
// separator (or one side of the split is empty).
const defaultV1TagKey = "tag"

func (d *v1Decoder) convertV1TagsForOrg(orgID valuer.UUID, raw any) []*tagtypes.Tag {
	if raw == nil {
		return nil
	}
	rawTagsList, ok := raw.([]any)
	if !ok {
		d.noteMalformedField("tags", raw)
		return nil
	}
	seen := make(map[string]struct{}, len(rawTagsList))
	tagsV2 := make([]*tagtypes.Tag, 0, len(rawTagsList))
	for i, rawTag := range rawTagsList {
		s, ok := rawTag.(string)
		if !ok {
			d.noteMalformedField(fmt.Sprintf("tags[%d]", i), rawTag)
			continue
		}
		key, value, ok := normalizeV1Tag(s)
		if !ok {
			continue
		}
		dedupKey := strings.ToLower(key) + "\x00" + strings.ToLower(value)
		if _, dup := seen[dedupKey]; dup {
			continue
		}
		seen[dedupKey] = struct{}{}
		tagsV2 = append(tagsV2, tagtypes.NewTag(orgID, coretypes.KindDashboard, key, value))
	}
	return tagsV2
}

// normalizeV1Tag derives a (key, value) pair from one v1 tag string. After
// splitting and molding both sides, a lone survivor becomes a value under the
// default key; ok is false if neither survives.
func normalizeV1Tag(s string) (string, string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", "", false
	}

	var rawKey, rawValue string
	switch {
	case strings.Contains(s, ":"):
		rawKey, rawValue, _ = strings.Cut(s, ":")
		// Only the first ":" separates key from value; collapse the rest.
		rawValue = strings.ReplaceAll(rawValue, ":", "_")
	case strings.Contains(s, "/"):
		rawKey, rawValue, _ = strings.Cut(s, "/")
	default:
		rawValue = s
	}
	rawKey = strings.TrimSpace(rawKey)
	rawValue = strings.TrimSpace(rawValue)

	// Reserved-key collision: prefix "_" so the list-query DSL stays unambiguous.
	if _, reserved := reservedDSLKeys[DSLKey(strings.ToLower(rawKey))]; rawKey != "" && reserved {
		rawKey = "_" + rawKey
	}

	key := moldTagField(rawKey, tagKeyDisallowed, tagKeyNotLead, tagtypes.MAX_LEN_TAG_KEY)
	value := moldTagField(rawValue, tagValueDisallowed, nil, tagtypes.MAX_LEN_TAG_VALUE)
	switch {
	case key == "" && value == "":
		return "", "", false
	case key == "":
		return defaultV1TagKey, value, true
	case value == "":
		return defaultV1TagKey, key, true
	default:
		return key, value, true
	}
}

// Inverse of tagKeyRegex/tagValueRegex ("/" always rejected); tagKeyNotLead
// matches a bad first char for a key. TestMoldedV1TagsPassValidation guards drift.
var (
	tagKeyDisallowed   = regexp.MustCompile(`[^a-zA-Z0-9$_@#{}:-]+`)
	tagValueDisallowed = regexp.MustCompile(`[^a-zA-Z0-9$_@#{}:.+=-]+`)
	tagKeyNotLead      = regexp.MustCompile(`^[^a-zA-Z$_@{#]`)
)

// moldTagField collapses disallowed runs to "_", prefixes "_" if notLead hits
// the first char, and caps at max. Keeps a leading "_", trims a trailing one.
func moldTagField(s string, disallowed, notLead *regexp.Regexp, max int) string {
	s = strings.TrimRight(disallowed.ReplaceAllString(s, "_"), "_")
	if s != "" && notLead != nil && notLead.MatchString(s) {
		s = "_" + s
	}
	if len(s) > max {
		s = strings.TrimRight(s[:max], "_")
	}
	return s
}
