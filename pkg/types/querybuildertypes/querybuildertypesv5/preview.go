package querybuildertypesv5

// PreviewTask is one rendered statement queued for granule/estimate analysis.
// StmtIdx is where its results merge back into the query's Statements.
type PreviewTask struct {
	Name    string
	StmtIdx int
	Query   string
	Args    []any
}
