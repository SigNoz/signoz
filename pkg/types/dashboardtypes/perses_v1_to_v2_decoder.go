package dashboardtypes

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// ══════════════════════════════════════════════
// v1 decoder
// ══════════════════════════════════════════════

// v1Decoder reads fields out of the untyped v1 dashboard blob. Every read*
// method follows the same contract: a field that is absent or null yields the
// zero value; a field present with the wrong type yields zero AND records a
// malformed-field error. Conversion proceeds (so one bad field doesn't abort
// the rest) and ConvertV1ToV2 returns d.malformedFieldsErr() at the end so the
// dashboard is logged and skipped.
//
// Polymorphic v1 fields (spanGaps bool|number, selectedValue string|array, …)
// are read with a type switch on the already-extracted value, never through
// these accessors, so they stay lenient by construction.
type v1Decoder struct {
	bad  []string
	seen map[string]struct{}
}

// note records a decoding problem (malformed field, unknown value, swallowed
// sub-parse error), deduping identical messages. ConvertV1ToV2 surfaces these
// via errIfHasMalformedFields.
func (d *v1Decoder) note(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	if _, dup := d.seen[msg]; dup {
		return
	}
	if d.seen == nil {
		d.seen = make(map[string]struct{})
	}
	d.seen[msg] = struct{}{}
	d.bad = append(d.bad, msg)
}

// noteMalformedField records a v1 field present with the wrong Go type.
func (d *v1Decoder) noteMalformedField(field string, raw any) {
	d.note("%q has unexpected type %T", field, raw)
}

// detailErr renders an error for a diagnostic note, unfolding the structured
// detail our JSON binding attaches via WithAdditional. A plain %v on these
// errors prints only the innermost message ("request body contains invalid
// field value") and drops the field/type context that says which field was
// wrong — the part that actually tells you what to fix.
func detailErr(err error) string {
	if err == nil {
		return ""
	}
	j := errors.AsJSON(err)
	if len(j.Errors) == 0 {
		return err.Error()
	}
	details := make([]string, 0, len(j.Errors))
	for _, e := range j.Errors {
		details = append(details, e.Message)
	}
	return j.Message + ": " + strings.Join(details, "; ")
}

func (d *v1Decoder) errIfHasMalformedFields() error {
	if len(d.bad) == 0 {
		return nil
	}
	// One field per line: these lists run long (a bad widget query is reported
	// once per widget), and a single "; "-joined line is an unscannable wall.
	return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "malformed v1 dashboard fields:\n  %s", strings.Join(d.bad, "\n  "))
}

func readField[T any](d *v1Decoder, m map[string]any, key string) T {
	var zero T
	v, present := m[key]
	if !present || v == nil {
		return zero
	}
	t, ok := v.(T)
	if !ok {
		d.noteMalformedField(key, v)
		return zero
	}
	return t
}

func (d *v1Decoder) readString(m map[string]any, key string) string {
	return readField[string](d, m, key)
}
func (d *v1Decoder) readFloat(m map[string]any, key string) float64 {
	v, present := m[key]
	if !present || v == nil {
		return 0
	}
	f, ok := coerceFloat(v)
	if !ok {
		d.noteMalformedField(key, v)
		return 0
	}
	return f
}

// coerceFloat accepts a JSON number or a numeric string (v1 sometimes stores
// numbers like softMin as quoted strings). A blank string is "unset", not a
// number, so it fails to coerce.
func coerceFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(n), 64)
		if err != nil {
			return 0, false
		}
		return f, true
	}
	return 0, false
}
func (d *v1Decoder) readBool(m map[string]any, key string) bool   { return readField[bool](d, m, key) }
func (d *v1Decoder) readArray(m map[string]any, key string) []any { return readField[[]any](d, m, key) }
func (d *v1Decoder) readObject(m map[string]any, key string) map[string]any {
	return readField[map[string]any](d, m, key)
}

// readInt narrows a numeric field to int (JSON numbers decode as float64).
func (d *v1Decoder) readInt(m map[string]any, key string) int { return int(d.readFloat(m, key)) }

func (d *v1Decoder) readFloatPtr(m map[string]any, key string) *float64 {
	v, present := m[key]
	if !present || v == nil {
		return nil
	}
	// A blank string means "unset" (v1's empty softMin/softMax), not malformed.
	if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
		return nil
	}
	f, ok := coerceFloat(v)
	if !ok {
		d.noteMalformedField(key, v)
		return nil
	}
	return &f
}

// clipName truncates s to at most limit runes so a v1 name over a v2 length bound
// (MaxDisplayNameLen / MaxLayoutTitleLen) is shortened rather than failing migration.
func clipName(s string, limit int) string {
	r := []rune(s)
	if len(r) <= limit {
		return s
	}
	return string(r[:limit])
}

func (d *v1Decoder) readStringMap(m map[string]any, key string) map[string]string {
	// An empty list is a stand-in for an empty map here; tolerate it silently
	// rather than flagging the wrong-type as malformed.
	if s, ok := m[key].([]any); ok && len(s) == 0 {
		return nil
	}
	raw := d.readObject(m, key)
	if len(raw) == 0 {
		return nil
	}
	out := make(map[string]string, len(raw))
	for k, v := range raw {
		s, ok := v.(string)
		if !ok {
			d.noteMalformedField(key+"."+k, v)
			continue
		}
		out[k] = s
	}
	return out
}

func (d *v1Decoder) readObjects(m map[string]any, key string) []map[string]any {
	raw := d.readArray(m, key)
	if len(raw) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(raw))
	for i, item := range raw {
		obj, ok := item.(map[string]any)
		if !ok {
			d.noteMalformedField(fmt.Sprintf("%s[%d]", key, i), item)
			continue
		}
		out = append(out, obj)
	}
	return out
}

// decodeMapInto converts an untyped map[string]any into a typed T by
// round-tripping through JSON, letting encoding/json (struct tags, custom
// UnmarshalJSON) do the field mapping instead of hand-copying out of the map.
func decodeMapInto[T any](src map[string]any) (T, error) {
	var dst T
	bytes, err := json.Marshal(src)
	if err != nil {
		return dst, err
	}
	if err := json.Unmarshal(bytes, &dst); err != nil {
		return dst, err
	}
	return dst, nil
}
