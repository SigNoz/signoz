package telemetrytypes

// ============================================================================
// Test JSON Type Set Data Setup
// ============================================================================

// TestJSONTypeSet returns a map of path->types for testing.
// This represents the type information available in the test JSON structure.
func TestJSONTypeSet() (map[string][]JSONDataType, MetadataStore) {
	types := map[string][]JSONDataType{

		// ── user (primitives) ─────────────────────────────────────────────
		"user.name":        {String},
		"user.permissions": {ArrayString},
		"user.age":         {Int64, String}, // Int64/String ambiguity
		"user.height":      {Float64},
		"user.active":      {Bool}, // Bool — not IndexSupported

		// Deeper non-array nesting (a.b.c — no array hops)
		"user.address.zip": {Int64},

		// ── education[] ───────────────────────────────────────────────────
		// Pattern: x[].y
		"education":              {ArrayJSON},
		"education[].name":       {String},
		"education[].type":       {String, Int64},
		"education[].year":       {Int64},
		"education[].scores":     {ArrayInt64},
		"education[].parameters": {ArrayFloat64, ArrayDynamic},

		// Pattern: x[].y[]
		"education[].awards": {ArrayDynamic, ArrayJSON},

		// Pattern: x[].y[].z
		"education[].awards[].name":     {String},
		"education[].awards[].type":     {String},
		"education[].awards[].semester": {Int64},

		// Pattern: x[].y[].z[]
		"education[].awards[].participated": {ArrayDynamic, ArrayJSON},

		// Pattern: x[].y[].z[].w
		"education[].awards[].participated[].members": {ArrayString},

		// Pattern: x[].y[].z[].w[]
		"education[].awards[].participated[].team": {ArrayJSON},

		// Pattern: x[].y[].z[].w[].v
		"education[].awards[].participated[].team[].branch": {String},

		// ── interests[] ───────────────────────────────────────────────────
		"interests":                                                                 {ArrayJSON},
		"interests[].entities":                                                      {ArrayJSON},
		"interests[].entities[].reviews":                                            {ArrayJSON},
		"interests[].entities[].reviews[].entries":                                  {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata":                       {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions":           {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":    {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings": {ArrayInt64, ArrayString},
		"http-events":                     {ArrayJSON},
		"http-events[].request-info.host": {String},
		"ids":                             {ArrayDynamic},

		// ── top-level primitives ──────────────────────────────────────────
		"message":     {String},
		"http-status": {Int64, String}, // hyphen in root key, ambiguous

		// ── top-level nested objects (no array hops) ───────────────────────
		"response.time-taken": {Float64}, // hyphen inside nested key
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
