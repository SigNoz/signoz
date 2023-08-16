package otlpreceiver

type HTTPServerSettings struct {
	// Endpoint configures the listening address for the server.
	Endpoint string `mapstructure:"endpoint" yaml:"endpoint"`

	// TLSSetting struct exposes TLS client configuration.
	TLSSetting *TLSServerSetting `mapstructure:"tls" yaml:"tls"`
}
