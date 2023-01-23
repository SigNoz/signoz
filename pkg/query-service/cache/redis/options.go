package redis

const (
	DefaultHost = "localhost"
	DefaultPort = 6379
)

type Options struct {
	Host     string `yaml:"host,omitempty"`
	Port     int    `yaml:"port,omitempty"`
	Password string `yaml:"password,omitempty"`
	DB       int    `yaml:"db,omitempty"`
}

func NewOptions() *Options {
	return &Options{
		Host: DefaultHost,
		Port: DefaultPort,
	}
}
