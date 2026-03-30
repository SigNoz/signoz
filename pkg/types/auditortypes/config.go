package auditortypes

import "time"

const (
	DefaultChannelBufferSize = 1000
	DefaultFlushInterval     = 1 * time.Second
	DefaultMaxBatchSize      = 100
)

// Config holds configuration for the audit event exporter.
type Config struct {
	// Endpoint is the OTLP HTTP endpoint for exporting audit events.
	Endpoint string `json:"endpoint" yaml:"endpoint"`

	// ChannelBufferSize is the capacity of the buffered event channel.
	ChannelBufferSize int `json:"channelBufferSize" yaml:"channel_buffer_size"`

	// FlushInterval is how often the background goroutine flushes events.
	FlushInterval time.Duration `json:"flushInterval" yaml:"flush_interval"`

	// MaxBatchSize is the maximum number of events per OTLP export batch.
	MaxBatchSize int `json:"maxBatchSize" yaml:"max_batch_size"`
}

// NewDefaultConfig returns a Config with default values.
func NewDefaultConfig() Config {
	return Config{
		ChannelBufferSize: DefaultChannelBufferSize,
		FlushInterval:     DefaultFlushInterval,
		MaxBatchSize:      DefaultMaxBatchSize,
	}
}
