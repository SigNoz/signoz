package server

import (
	"crypto/tls"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

var tlsVersions = map[string]uint16{
	"1.2": tls.VersionTLS12,
	"1.3": tls.VersionTLS13,
}

type Config struct {
	// Address specifies the TCP address for the server to listen on, in the form "host:port".
	// If empty, ":http" (port 80) is used. The service names are defined in RFC 6335 and assigned by IANA.
	// See net.Dial for details of the address format.
	Address string `mapstructure:"address"`

	// ReadTimeout bounds reading an entire request, including the body. Zero means no timeout.
	ReadTimeout time.Duration `mapstructure:"read_timeout"`

	// WriteTimeout bounds writing the response. Zero means no timeout, required for
	// streaming endpoints that hold the connection open.
	WriteTimeout time.Duration `mapstructure:"write_timeout"`

	TLS TLS `mapstructure:"tls"`
}

type TLS struct {
	Enabled bool `mapstructure:"enabled"`

	// The full path to the certificate file.
	CertFile string `mapstructure:"cert_file"`

	// The full path to the key file.
	KeyFile string `mapstructure:"key_file"`

	// MinVersion is the minimum acceptable TLS version, "1.2" or "1.3". Empty uses the Go default.
	MinVersion string `mapstructure:"min_version"`
}

func (c Config) Validate() error {
	if !c.TLS.Enabled {
		return nil
	}

	if c.TLS.CertFile == "" || c.TLS.KeyFile == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "tls::cert_file and tls::key_file are required when tls is enabled")
	}

	_, err := tlsVersion(c.TLS.MinVersion)
	if err != nil {
		return err
	}

	return nil
}

func (tlsConfig TLS) Config() (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(tlsConfig.CertFile, tlsConfig.KeyFile)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot load tls::cert_file and tls::key_file: %v", err)
	}

	minVersion, err := tlsVersion(tlsConfig.MinVersion)
	if err != nil {
		return nil, err
	}

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   minVersion,
	}, nil
}

func tlsVersion(name string) (uint16, error) {
	if name == "" {
		return 0, nil
	}

	version, ok := tlsVersions[name]
	if !ok {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid tls version %q, must be \"1.2\" or \"1.3\"", name)
	}

	return version, nil
}
