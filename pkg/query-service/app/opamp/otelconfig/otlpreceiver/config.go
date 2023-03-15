package otlpreceiver

type Protocols struct {
	GRPC *GRPCServerSettings `mapstructure:"grpc"`
	HTTP *HTTPServerSettings `mapstructure:"http"`
}
