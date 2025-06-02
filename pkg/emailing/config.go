package emailing

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	Enabled   bool      `mapstructure:"enabled"`
	Templates Templates `mapstructure:"templates"`
	SMTP      SMTP      `mapstructure:"smtp"`
}

type Templates struct {
	Directory string `mapstructure:"directory"`
}

type SMTP struct {
	Address string            `mapstructure:"address"`
	From    string            `mapstructure:"from"`
	Hello   string            `mapstructure:"hello"`
	Headers map[string]string `mapstructure:"headers"`
	Auth    SMTPAuth          `mapstructure:"auth"`
	TLS     SMTPTLS           `mapstructure:"tls"`
}

type SMTPAuth struct {
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Secret   string `mapstructure:"secret"`
	Identity string `mapstructure:"identity"`
}

type SMTPTLS struct {
	Enabled            bool   `mapstructure:"enabled"`
	InsecureSkipVerify bool   `mapstructure:"insecure_skip_verify"`
	CAFilePath         string `mapstructure:"ca_file_path"`
	KeyFilePath        string `mapstructure:"key_file_path"`
	CertFilePath       string `mapstructure:"cert_file_path"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("emailing"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled: false,
		Templates: Templates{
			Directory: "/root/templates",
		},
		SMTP: SMTP{
			Address: "localhost:25",
			From:    "",
			Hello:   "",
			Headers: map[string]string{},
			Auth: SMTPAuth{
				Username: "",
				Password: "",
				Secret:   "",
				Identity: "",
			},
			TLS: SMTPTLS{
				Enabled:            false,
				InsecureSkipVerify: false,
				CAFilePath:         "",
				KeyFilePath:        "",
				CertFilePath:       "",
			},
		},
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "smtp"
	}

	return "noop"
}
