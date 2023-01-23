package status

// RetrieveStatus defines the possible status of a cache lookup
type RetrieveStatus int

const (
	RetrieveStatusHit = RetrieveStatus(iota)
	RetrieveStatusPartialHit
	RetrieveStatusRangeMiss
	RetrieveStatusKeyMiss
	RetrieveStatusRevalidated

	RetrieveStatusError
)
