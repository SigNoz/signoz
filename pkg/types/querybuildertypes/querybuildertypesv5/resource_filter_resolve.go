package querybuildertypesv5

type ResourceFilterResolveKind int

const (
	ResourceFilterResolveKindNoOp ResourceFilterResolveKind = iota
	ResourceFilterResolveKindUseCTE
	ResourceFilterResolveKindFallback
)
