package querybuildertypesv5

// PreviewTask is one rendered statement queued for granule/estimate analysis.
// StmtIdx is where its results merge back into the query's Statements.
type PreviewTask struct {
	Name    string
	StmtIdx int
	Query   string
	Args    []any
}

// ExplainPlanNode is a node in ClickHouse's `EXPLAIN json = 1, indexes = 1`
// output, parsed to derive the granule-skip breakdown for a statement.
type ExplainPlanNode struct {
	NodeType    string             `json:"Node Type"`
	Description string             `json:"Description"`
	Indexes     []ExplainPlanIndex `json:"Indexes"`
	Plans       []ExplainPlanNode  `json:"Plans"`
}

// ExplainPlanIndex is one index entry under a ReadFromMergeTree node in the
// EXPLAIN plan, reporting the parts/granules entering and surviving the index.
type ExplainPlanIndex struct {
	Type             string   `json:"Type"`
	Name             string   `json:"Name"`
	Keys             []string `json:"Keys"`
	Condition        string   `json:"Condition"`
	InitialParts     *int64   `json:"Initial Parts"`
	SelectedParts    *int64   `json:"Selected Parts"`
	InitialGranules  *int64   `json:"Initial Granules"`
	SelectedGranules *int64   `json:"Selected Granules"`
}
