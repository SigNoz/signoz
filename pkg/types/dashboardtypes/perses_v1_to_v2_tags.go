package dashboardtypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ══════════════════════════════════════════════
// Tags
// ══════════════════════════════════════════════

// v1 carries tags as a flat []string; v2 tags are (key, value) pairs. Each v1
// string is normalized into a pair following the rules in pkg/types/migration.md
// (separator split, empty-side fallback, reserved-key prefix, `/` scrub). Tags
// that normalize to the same (lower(key), lower(value)) within a dashboard are
// collapsed, first occurrence winning the display casing.
//
// Characters still illegal after normalization (e.g. spaces) are left intact:
// such tags fail tag validation downstream and are logged for the customer to
// fix, per the migration's dry-run plan.

// defaultV1TagKey is the key assigned when a v1 tag string has no usable
// separator (or one side of the split is empty).
const defaultV1TagKey = "tag"

func convertV1TagsForOrg(orgID valuer.UUID, raw any) []*tagtypes.Tag {
	rawSlice, ok := raw.([]any)
	if !ok {
		return nil
	}
	seen := make(map[string]struct{}, len(rawSlice))
	out := make([]*tagtypes.Tag, 0, len(rawSlice))
	for _, item := range rawSlice {
		s, ok := item.(string)
		if !ok {
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
		out = append(out, tagtypes.NewTag(orgID, coretypes.KindDashboard, key, value))
	}
	return out
}

// normalizeV1Tag derives a (key, value) pair from one v1 tag string per the
// ordered rules in pkg/types/migration.md. ok is false when the string has no
// usable content (empty after trimming, or a bare separator).
func normalizeV1Tag(s string) (string, string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", "", false
	}

	var key, value string
	var ok bool
	switch {
	case strings.Contains(s, ":"):
		key, value, ok = splitV1Tag(s, ":")
		// Only the first ":" separates key from value; collapse the rest.
		value = strings.ReplaceAll(value, ":", "_")
	case strings.Contains(s, "/"):
		key, value, ok = splitV1Tag(s, "/")
	default:
		key, value, ok = defaultV1TagKey, s, true
	}
	if !ok {
		return "", "", false
	}

	// Reserved-key collision: prefix with "_" so the list-query DSL stays
	// unambiguous. Matched case-insensitively against the DSL column names.
	if _, reserved := reservedDSLKeys[DSLKey(strings.ToLower(key))]; reserved {
		key = "_" + key
	}

	// Stored tags must never contain "/" (input validation forbids it).
	key = strings.ReplaceAll(key, "/", "_")
	value = strings.ReplaceAll(value, "/", "_")

	return key, value, true
}

// splitV1Tag splits s at the first occurrence of sep, trimming each side. An
// empty side collapses to the default key with the non-empty side as the value;
// if both sides are empty (a bare separator) ok is false.
func splitV1Tag(s, sep string) (string, string, bool) {
	left, right, _ := strings.Cut(s, sep)
	left = strings.TrimSpace(left)
	right = strings.TrimSpace(right)
	switch {
	case left == "" && right == "":
		return "", "", false
	case left == "":
		return defaultV1TagKey, right, true
	case right == "":
		return defaultV1TagKey, left, true
	default:
		return left, right, true
	}
}
