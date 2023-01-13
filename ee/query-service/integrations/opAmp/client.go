package opamp

import (
	otelConfMap "go.opentelemetry.io/collector/confmap"
)

type Client struct {
	Endpoint string
}

// SendConfig sends new config to opamp server
func (c *Client) SendConfig(conf otelConfMap.Conf) (*otelConfMap.Conf, error) {
	//
	return nil, nil
}
