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

func (s RetrieveStatus) String() string {
	switch s {
	case RetrieveStatusHit:
		return "hit"
	case RetrieveStatusPartialHit:
		return "partial hit"
	case RetrieveStatusRangeMiss:
		return "range miss"
	case RetrieveStatusKeyMiss:
		return "key miss"
	case RetrieveStatusRevalidated:
		return "revalidated"
	case RetrieveStatusError:
		return "error"
	default:
		return "unknown"
	}
}
