package inframonitoringtypes

const (
	NamespacesOrderByCPU    = "cpu"
	NamespacesOrderByMemory = "memory"
)

var NamespacesValidOrderByKeys = []string{
	NamespacesOrderByCPU,
	NamespacesOrderByMemory,
}
