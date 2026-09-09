package server

import "time"

// Config holds the configuration for http.
type Config struct {
	//Address specifies the TCP address for the server to listen on, in the form "host:port".
	// If empty, ":http" (port 80) is used. The service names are defined in RFC 6335 and assigned by IANA.
	// See net.Dial for details of the address format.
	Address string `mapstructure:"address"`

	// ReadTimeout bounds reading an entire request, including the body. Zero means no timeout.
	ReadTimeout time.Duration `mapstructure:"read_timeout"`

	// WriteTimeout bounds writing the response. Zero means no timeout, required for
	// streaming endpoints that hold the connection open.
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}
