package telemetrytypes

// ============================================================================
// Test JSON Type Set Data Setup
// ============================================================================

// TestJSONTypeSet returns a map of path->types for testing.
// This represents the type information available in the test JSON structure.
//
// Structural patterns covered:
//
//	Primitives            message, count, duration, user.name, user.age, ...
//	x.y                   service.name, response.code, user.address.city
//	x[].y                 education[].name, http-events[].request-id
//	x[].y.z               education[].metadata.location, http-events[].request-info.host
//	x[].y.z[]             http-events[].request-info.headers (array behind non-array hop)
//	x[].y.z.a[]           http-events[].request-info.meta-data.entries (two non-array hops → array)
//	x[].y[]               education[].awards
//	x[].y[].z             education[].awards[].name
//	x[].y[].z[]           education[].awards[].participated
//	x[].y[].z[].w         education[].awards[].participated[].type
//	x[].y[].z[].w[]       education[].awards[].participated[].team
//	x[].y[].z[].w[].v     education[].awards[].participated[].team[].branch
func TestJSONTypeSet() (map[string][]JSONDataType, MetadataStore) {
	types := map[string][]JSONDataType{

		// ── user (primitives) ─────────────────────────────────────────────
		"user.name":        {String},
		"user.permissions": {ArrayString},
		"user.age":         {Int64, String}, // Int64/String ambiguity
		"user.height":      {Float64},
		"user.active":      {Bool},           // Bool — not IndexSupported
		"user.score":       {Float64, Int64}, // numeric Float64/Int64 ambiguity

		// Deeper non-array nesting (a.b.c — no array hops)
		"user.address.city":    {String},
		"user.address.zip":     {Int64},
		"user.address.country": {String, Int64}, // deep + ambiguous

		// ── education[] ───────────────────────────────────────────────────
		// Pattern: x[].y
		"education":                 {ArrayJSON},
		"education[].name":          {String},
		"education[].type":          {String, Int64},
		"education[].internal_type": {String},
		"education[].duration":      {String},
		"education[].mode":          {String},
		"education[].year":          {Int64},
		"education[].field":         {String},
		"education[].grades":        {ArrayBool},  // bool array terminal
		"education[].scores":        {ArrayInt64}, // int array terminal
		"education[].parameters":    {ArrayFloat64, ArrayDynamic},

		// Pattern: x[].y.z
		"education[].metadata.location": {String},

		// Pattern: x[].y[]
		"education[].awards": {ArrayDynamic, ArrayJSON},

		// Pattern: x[].y[].z
		"education[].awards[].name":     {String},
		"education[].awards[].rank":     {Int64},
		"education[].awards[].medal":    {String},
		"education[].awards[].type":     {String},
		"education[].awards[].semester": {Int64},

		// Pattern: x[].y[].z[]
		"education[].awards[].participated": {ArrayDynamic, ArrayJSON},

		// Pattern: x[].y[].z[].w
		"education[].awards[].participated[].type":         {String},
		"education[].awards[].participated[].field":        {String},
		"education[].awards[].participated[].project_type": {String},
		"education[].awards[].participated[].project_name": {String},
		"education[].awards[].participated[].race_type":    {String},
		"education[].awards[].participated[].team_based":   {Bool},
		"education[].awards[].participated[].team_name":    {String},
		"education[].awards[].participated[].members":      {ArrayString},

		// Pattern: x[].y[].z[].w[]
		"education[].awards[].participated[].team": {ArrayJSON},

		// Pattern: x[].y[].z[].w[].v
		"education[].awards[].participated[].team[].name":     {String},
		"education[].awards[].participated[].team[].branch":   {String},
		"education[].awards[].participated[].team[].semester": {Int64},

		// ── interests[] ───────────────────────────────────────────────────
		"interests":                             {ArrayJSON},
		"interests[].type":                      {String},
		"interests[].entities":                  {ArrayJSON},
		"interests[].entities.application_date": {String},

		"interests[].entities[].reviews":                 {ArrayJSON},
		"interests[].entities[].reviews[].given_by":      {String},
		"interests[].entities[].reviews[].remarks":       {String},
		"interests[].entities[].reviews[].weight":        {Float64},
		"interests[].entities[].reviews[].passed":        {Bool},
		"interests[].entities[].reviews[].type":          {String},
		"interests[].entities[].reviews[].analysis_type": {Int64},
		"interests[].entities[].reviews[].score":         {Float64},   // additional Float64 primitive
		"interests[].entities[].reviews[].flags":         {ArrayBool}, // bool array in deep nesting

		"interests[].entities[].reviews[].entries":           {ArrayJSON},
		"interests[].entities[].reviews[].entries[].subject": {String},
		"interests[].entities[].reviews[].entries[].status":  {String},

		"interests[].entities[].reviews[].entries[].metadata":              {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].company":    {String},
		"interests[].entities[].reviews[].entries[].metadata[].experience": {Int64},
		"interests[].entities[].reviews[].entries[].metadata[].unit":       {String},

		"interests[].entities[].reviews[].entries[].metadata[].positions":            {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":     {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].duration": {Int64, Float64},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].unit":     {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings":  {ArrayInt64, ArrayString},

		// ── http-events[] ─────────────────────────────────────────────────
		// Segments use -, @, _ symbols. Root is a single ArrayJSON.
		//
		// Pattern: x[].y
		"http-events":               {ArrayJSON},
		"http-events[].request-id":  {String},
		"http-events[].status-code": {Int64, String}, // ambiguous
		"http-events[].@type":       {String, Int64}, // @ symbol + ambiguous

		// Pattern: x[].y.z  (non-array intermediate, primitive terminal)
		"http-events[].request-info.host":   {String},
		"http-events[].request-info.port":   {Int64, Float64}, // numeric ambiguity
		"http-events[].request-info.method": {String},
		"http-events[].@context.version":    {Int64}, // @ in intermediate segment
		"http-events[].@context.format":     {String},

		// Pattern: x[].y.z[]  (non-array intermediate, array terminal)
		"http-events[].request-info.headers":         {ArrayJSON, ArrayDynamic},
		"http-events[].request-info.headers[].name":  {String},
		"http-events[].request-info.headers[].value": {String, Int64}, // ambiguous
		"http-events[].@context.tags":                {ArrayString},   // @ + simple array terminal

		// Pattern: x[].y.z.a[]  (two non-array hops then array)
		"http-events[].request-info.meta-data.entries":          {ArrayJSON, ArrayDynamic},
		"http-events[].request-info.meta-data.entries[].key":    {String},
		"http-events[].request-info.meta-data.entries[].value":  {String, Int64}, // ambiguous
		"http-events[].request-info.meta-data.entries[]._score": {Float64},       // _ prefix

		// ── top-level primitives ──────────────────────────────────────────
		// Every IndexSupported scalar type, plus Bool and ambiguous pairs.
		"message":  {String},
		"error":    {Bool, String},   // Bool — not IndexSupported
		"order-Id": {Float64, Int64}, // numeric Float64/Int64 ambiguity at root

		// Special characters in root-level keys
		"http-status": {Int64, String}, // hyphen in root key, ambiguous
		"_internal":   {String},        // underscore prefix
		"@version":    {String, Int64}, // @ at root level, ambiguous

		// ── top-level nested objects (no array hops) ───────────────────────
		"service.name":    {String},
		"service.version": {String, Int64}, // ambiguous
		"service.weight":  {Float64},
		"service.active":  {Bool},
		"response.code":       {Int64, String, ArrayString}, // ambiguous
		"response.message":    {String},
		"response.time-taken": {Float64}, // hyphen inside nested key

		// ── top-level arrays ──────────────────────────────────────────────
		// One array of every type so every array terminal branch is reachable
		// from a non-array root path.
		"tags": {ArrayString},
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
//   - user.active, service.active → Bool, IndexSupported=false
//   - error (Bool variant)        → Bool, IndexSupported=false
//   - response.code (ArrayString) → array type, cannot be indexed
//   - http-events[].*             → inside an array hop; array-nested fields cannot be indexed
//   - education[].*               → same reason
//   - tags                        → array type, cannot be indexed
var TestIndexedPaths = []TestIndexedPathEntry{
	// root-level primitives
	{Path: "message",  Type: String},
	{Path: "error",    Type: String},  // String variant of the Bool/String ambiguous field
	{Path: "order-Id", Type: Float64}, // hyphen in key, Float64 variant
	{Path: "order-Id", Type: Int64},   // Int64 variant

	// root-level with special characters
	{Path: "http-status", Type: Int64},
	{Path: "http-status", Type: String},
	{Path: "_internal",   Type: String},
	{Path: "@version",    Type: String},
	{Path: "@version",    Type: Int64},

	// root-level nested objects (no array hops)
	{Path: "service.name",       Type: String},
	{Path: "service.version",    Type: String},
	{Path: "service.version",    Type: Int64},
	{Path: "service.weight",     Type: Float64},
	{Path: "response.code",      Type: Int64},
	{Path: "response.code",      Type: String},
	{Path: "response.message",   Type: String},
	{Path: "response.time-taken", Type: Float64},

	// user primitives — all IndexSupported types
	{Path: "user.name",   Type: String},
	{Path: "user.age",    Type: Int64},
	{Path: "user.age",    Type: String},
	{Path: "user.height", Type: Float64},
	{Path: "user.score",  Type: Float64},
	{Path: "user.score",  Type: Int64},

	// user.address — deeper non-array nesting
	{Path: "user.address.city",    Type: String},
	{Path: "user.address.zip",     Type: Int64},
	{Path: "user.address.country", Type: String},
	{Path: "user.address.country", Type: Int64},
}
