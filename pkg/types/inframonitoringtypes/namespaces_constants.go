package inframonitoringtypes

const NamespaceNameAttrKey = "k8s.namespace.name"

const (
	NamespacesOrderByCPU    = "cpu"
	NamespacesOrderByMemory = "memory"
)

var NamespacesValidOrderByKeys = []string{
	NamespacesOrderByCPU,
	NamespacesOrderByMemory,
	NamespaceNameAttrKey,
}
