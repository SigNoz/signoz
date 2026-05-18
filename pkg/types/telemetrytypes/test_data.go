package telemetrytypes

// ============================================================================
// Test JSON Type Set Data Setup
// ============================================================================

// TestJSONTypeSet returns a map of path->field data types for testing.
// This represents the type information available in the test JSON structure.
func TestJSONTypeSet() (map[string][]FieldDataType, MetadataStore) {
	types := map[string][]FieldDataType{

		// ── user (primitives) ─────────────────────────────────────────────
		"user.name":        {FieldDataTypeString},
		"user.permissions": {FieldDataTypeArrayString},
		"user.age":         {FieldDataTypeInt64, FieldDataTypeString}, // Int64/String ambiguity
		"user.height":      {FieldDataTypeFloat64},
		"user.active":      {FieldDataTypeBool}, // Bool — not IndexSupported

		// Deeper non-array nesting (a.b.c — no array hops)
		"user.address.zip": {FieldDataTypeInt64},

		// ── education[] ───────────────────────────────────────────────────
		// Pattern: x[].y
		"education":              {FieldDataTypeArrayJSON},
		"education[].name":       {FieldDataTypeString},
		"education[].type":       {FieldDataTypeString, FieldDataTypeInt64},
		"education[].year":       {FieldDataTypeInt64},
		"education[].scores":     {FieldDataTypeArrayInt64},
		"education[].parameters": {FieldDataTypeArrayFloat64, FieldDataTypeArrayDynamic},

		// Pattern: x[].y[]
		"education[].awards": {FieldDataTypeArrayDynamic, FieldDataTypeArrayJSON},

		// Pattern: x[].y[].z
		"education[].awards[].name":     {FieldDataTypeString},
		"education[].awards[].type":     {FieldDataTypeString},
		"education[].awards[].semester": {FieldDataTypeInt64},

		// Pattern: x[].y[].z[]
		"education[].awards[].participated": {FieldDataTypeArrayDynamic, FieldDataTypeArrayJSON},

		// Pattern: x[].y[].z[].w
		"education[].awards[].participated[].members": {FieldDataTypeArrayString},

		// Pattern: x[].y[].z[].w[]
		"education[].awards[].participated[].team": {FieldDataTypeArrayJSON},

		// Pattern: x[].y[].z[].w[].v
		"education[].awards[].participated[].team[].branch": {FieldDataTypeString},

		// ── interests[] ───────────────────────────────────────────────────
		"interests":                                                                 {FieldDataTypeArrayJSON},
		"interests[].entities":                                                      {FieldDataTypeArrayJSON},
		"interests[].entities[].product_codes":                                      {FieldDataTypeArrayDynamic},
		"interests[].entities[].reviews":                                            {FieldDataTypeArrayJSON},
		"interests[].entities[].reviews[].entries":                                  {FieldDataTypeArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata":                       {FieldDataTypeArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions":           {FieldDataTypeArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":    {FieldDataTypeString},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings": {FieldDataTypeArrayInt64, FieldDataTypeArrayString},
		"http-events":                     {FieldDataTypeArrayJSON},
		"http-events[].request-info.host": {FieldDataTypeString},

		// ── top-level primitives ──────────────────────────────────────────
		"message":     {FieldDataTypeString},
		"http-status": {FieldDataTypeInt64, FieldDataTypeString}, // hyphen in root key, ambiguous

		// ── top-level nested objects (no array hops) ───────────────────────
		"response.time-taken": {FieldDataTypeFloat64}, // hyphen inside nested key
	}

	return types, nil
}

// TestIndexedPathEntry is a path + JSON type pair representing a field
// backed by a ClickHouse skip index in the test data.
//
// Only non-array paths with IndexSupported types (String, Int64, Float64)
// are valid entries — arrays and Bool cannot carry a skip index.
//
// The ColumnExpression for each entry is computed at test-setup time from
// the access plan, since it depends on the column name (e.g. body_v2)
// which is unknown to this package.
type TestIndexedPathEntry struct {
	Path string
	Type JSONDataType
}

// TestIndexedPaths lists path+type pairs from TestJSONTypeSet that are
// backed by a JSON data type index. Test setup uses this to populate
// key.Indexes after calling SetJSONAccessPlan.
//
// Intentionally excluded:
//   - user.active → Bool, IndexSupported=false
var TestIndexedPaths = []TestIndexedPathEntry{
	// user primitives
	{Path: "user.name", Type: String},

	// user.address — deeper non-array nesting
	{Path: "user.address.zip", Type: Int64},

	// root-level with special characters
	{Path: "http-status", Type: Int64},
	{Path: "http-status", Type: String},

	// root-level nested objects (no array hops)
	{Path: "response.time-taken", Type: Float64},
}
