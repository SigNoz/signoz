package redis

const (
	defaultHost     = "localhost"
	defaultPort     = 6379
	defaultPassword = ""
	defaultDB       = 0
)

type Options struct {
	Host     string `yaml:"host,omitempty"`
	Port     int    `yaml:"port,omitempty"`
	Password string `yaml:"password,omitempty"`
	DB       int    `yaml:"db,omitempty"`
}

func defaultOptions() *Options {
	return &Options{
		Host:     defaultHost,
		Port:     defaultPort,
		Password: defaultPassword,
		DB:       defaultDB,
	}
}
