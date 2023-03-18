package otlpworker

import (
	otelgrpc "go.opentelemetry.io/collector/config/configgrpc"
	otelnet "go.opentelemetry.io/collector/config/confignet"
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
)

func NewOtlpWorkerReceiver(endpoint string) otlpreceiver.Config {
	return otlpreceiver.Config{
		Protocols: otlpreceiver.Protocols{
			GRPC: &otelgrpc.GRPCServerSettings{
				NetAddr: otelnet.NetAddr{
					Endpoint: endpoint,
				},
			},
		},
	}
}
