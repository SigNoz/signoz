package labels

type BaseLabels interface {
	Len() int
	Swap(i, j int)
	Less(i, j int) bool
	String() string
	Hash() uint64
	HashForLabels(b []byte, names ...string) (uint64, []byte)
	Get(name string) string
	Has(name string) bool
	Map() map[string]string
}
