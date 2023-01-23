package filesystem

// cache implements the cache interface for the filesystem
type cache struct {
	opts *Options
}

func New(opts *Options) *cache {
	return &cache{opts: opts}
}
