package server

type options struct {
	listen string
}

type Option func(*options)

// WithListen sets address to listen for HTTP server.
// Server accepts incoming TCP connections on given address.
func WithListen(s string) Option {
	return func(o *options) {
		o.listen = s
	}
}
