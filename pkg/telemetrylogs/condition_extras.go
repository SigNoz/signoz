package telemetrylogs

// ArrayJoinReq describes one ARRAY JOIN pipeline stage.
type ArrayJoinReq struct {
	// The base expression that yields Array(Dynamic), e.g. "dynamicElement(body_v2.a, 'Array(Dynamic)')"
	DynamicArrayExpr string

	// Alias names to be used downstream (stable/deterministic per path/level).
	DynamicItemAlias string // e.g., "dynamic_item_0"
	JSONItemAlias    string // e.g., "json_item_0"

	// Logical path this join represents (for deduplication/ordering).
	Path string // e.g., "a:b"

	// Optional: downstream scalar access points to be projected/grouped on, e.g. "json_item_0.b"
	ScalarAccessHints []string
}
