package client

type Auth struct {
	Username string
	Password string
	Identity string
	Secret   string
}

type TLS struct {
	Enabled            bool
	InsecureSkipVerify bool
	CAFilePath         string
	KeyFilePath        string
	CertFilePath       string
}

type options struct {
	from    string
	headers map[string]string
	hello   string
	auth    Auth
	tls     TLS
}

type Option func(*options)

func WithFrom(s string) Option {
	return func(o *options) {
		o.from = s
	}
}

func WithHeaders(m map[string]string) Option {
	return func(o *options) {
		o.headers = m
	}
}

func WithHello(s string) Option {
	return func(o *options) {
		o.hello = s
	}
}

func WithAuth(auth Auth) Option {
	return func(o *options) {
		o.auth = auth
	}
}

func WithTLS(tls TLS) Option {
	return func(o *options) {
		o.tls = tls
	}
}
