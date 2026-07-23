package inframonitoringtypes

import (
	"encoding/json"
	"maps"
	"reflect"
	"strings"

	"github.com/swaggest/jsonschema-go"
)

// The meta field on every infra-monitoring v2 record carries a fixed set of
// guaranteed keys (surfaced as strongly-typed struct fields) plus any dynamic
// keys the caller introduces via group-by (kept in Extra). Each entity defines
// its own XMeta type; the helpers below give them a shared, wire-stable
// marshaling and schema contract:
//
//   - MarshalJSON  -> flattenMeta: known + Extra collapse into one flat object.
//   - UnmarshalJSON -> splitMeta: decode the flat object, route known keys to
//     fields (via the entity's NewXMeta), the rest to Extra.
//   - PrepareJSONSchema -> addStringAdditionalProps: keep the reflected known
//     properties and mark the object as an open map of string values.
//
// flattenMeta merges the guaranteed known keys and the open Extra map into a
// single flat JSON object, preserving the historical wire shape. known wins on
// collision. The output map is always non-nil, so an empty meta serializes as
// {} rather than null.
func flattenMeta(extra map[string]string, known map[string]string) ([]byte, error) {
	out := make(map[string]string, len(extra)+len(known))
	maps.Copy(out, extra)
	maps.Copy(out, known)
	return json.Marshal(out)
}

// splitMeta decodes a flat meta object into its raw string map. Callers pull
// their known keys out of the returned map; whatever remains becomes Extra.
func splitMeta(data []byte) (map[string]string, error) {
	raw := map[string]string{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}
	return raw, nil
}

// metaField is one guaranteed meta key discovered from an XMeta struct's json
// tags (json:"-" fields like Extra are skipped).
type metaField struct {
	index int
	key   string
}

// metaFieldsOf reflects the string fields of an XMeta struct (skipping json:"-"
// fields like Extra).
func metaFieldsOf(t reflect.Type) []metaField {
	fields := make([]metaField, 0, t.NumField())
	for i := range t.NumField() {
		f := t.Field(i)
		key, _, _ := strings.Cut(f.Tag.Get("json"), ",")
		if key == "" || key == "-" {
			continue
		}
		fields = append(fields, metaField{index: i, key: key})
	}
	return fields
}

// populateMeta routes src into the guaranteed fields of the XMeta pointed to by
// m (empty string when a key is absent) and returns the leftover keys (dynamic
// group-by keys) as Extra.
func populateMeta(m any, src map[string]string) map[string]string {
	extra := map[string]string{}
	maps.Copy(extra, src)
	rv := reflect.ValueOf(m).Elem()
	for _, f := range metaFieldsOf(rv.Type()) {
		rv.Field(f.index).SetString(src[f.key])
		delete(extra, f.key)
	}
	return extra
}

// marshalMeta flattens the guaranteed fields of the XMeta pointed to by m plus
// its Extra map into a single flat JSON object.
func marshalMeta(m any, extra map[string]string) ([]byte, error) {
	rv := reflect.ValueOf(m).Elem()
	known := make(map[string]string)
	for _, f := range metaFieldsOf(rv.Type()) {
		known[f.key] = rv.Field(f.index).String()
	}
	return flattenMeta(extra, known)
}

// getMetaKeys returns the guaranteed keys of an XMeta, in struct-field order. Used
// by implinframonitoring as the metadata fetch column list, keeping the key set
// defined once (on the struct).
func getMetaKeys(m any) []string {
	rv := reflect.ValueOf(m).Elem()
	fields := metaFieldsOf(rv.Type())
	keys := make([]string, 0, len(fields))
	for _, f := range fields {
		keys = append(keys, f.key)
	}
	return keys
}

// addStringAdditionalProps marks an already-reflected meta object schema as an
// open map of string values. The known properties and their required list come
// from struct-tag reflection (this runs after, via the Preparer hook); this
// only attaches additionalProperties:{type:string} so callers may add arbitrary
// group-by keys.
func addStringAdditionalProps(s *jsonschema.Schema) {
	s.WithAdditionalProperties(jsonschema.String.ToSchemaOrBool())
}
