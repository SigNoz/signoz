package querybuildertypesv5

// BucketCache is the only thing orchestrator cares about.
type BucketCache interface {
	// cached portion + list of gaps to fetch
	GetMissRanges(q Query) (cached Result, missing []TimeRange)
	// store fresh buckets for future hits
	Put(q Query, fresh Result)
}
