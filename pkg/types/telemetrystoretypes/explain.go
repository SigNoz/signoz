package telemetrystoretypes

// EstimateEntry is ClickHouse's EXPLAIN ESTIMATE for one table read: the parts,
// rows, and marks it estimates it will scan.
type EstimateEntry struct {
	Database string `json:"database" required:"true" nullable:"false"`
	Table    string `json:"table" required:"true" nullable:"false"`
	Parts    int64  `json:"parts" required:"true" nullable:"false"`
	Rows     int64  `json:"rows" required:"true" nullable:"false"`
	Marks    int64  `json:"marks" required:"true" nullable:"false"`
}

// Granules is the granule-skip breakdown for one statement, summed from
// `EXPLAIN json = 1, indexes = 1` across every ReadFromMergeTree node.
type Granules struct {
	Initial  int64           `json:"initial" required:"true" nullable:"false"`
	Selected int64           `json:"selected" required:"true" nullable:"false"`
	Skipped  int64           `json:"skipped" required:"true" nullable:"false"`
	Reads    []MergeTreeRead `json:"reads" required:"true" nullable:"false"`
}

// MergeTreeRead is the index-pruning funnel for one ReadFromMergeTree node. Steps
// run in sequence, so each step's Initial* matches the previous Selected*.
type MergeTreeRead struct {
	Table string      `json:"table" required:"true" nullable:"false"`
	Steps []IndexStep `json:"steps" required:"true" nullable:"false"`
}

// IndexStep is one index applied during a MergeTree read: parts and granules
// entering (Initial*) and surviving (Selected*) it. Type is the index kind
// (MinMax, Partition, PrimaryKey, or Skip).
type IndexStep struct {
	Type             string   `json:"type" required:"true" nullable:"false"`
	Name             string   `json:"name" required:"true" nullable:"false"`
	Keys             []string `json:"keys" required:"true" nullable:"false"`
	Condition        string   `json:"condition" required:"true" nullable:"false"`
	InitialParts     int64    `json:"initialParts" required:"true" nullable:"false"`
	SelectedParts    int64    `json:"selectedParts" required:"true" nullable:"false"`
	InitialGranules  int64    `json:"initialGranules" required:"true" nullable:"false"`
	SelectedGranules int64    `json:"selectedGranules" required:"true" nullable:"false"`
}
