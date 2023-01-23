package filesystem

const (
	DefaultDir = "/var/lib/signoz/cache"
)

type Options struct {
	Dir string `yaml:"cache_dit,omitempty"`
}

func NewOptions() *Options {
	return &Options{Dir: DefaultDir}
}
