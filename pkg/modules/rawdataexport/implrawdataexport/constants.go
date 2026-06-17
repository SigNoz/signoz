package implrawdataexport

import (
	"time"
)

const (
	// Data Limits.
	MaxExportBytesLimit = 10 * 1024 * 1024 * 1024 // 10 GB

	// Query Limits.
	ChunkSize                         = 10_000
	ClickhouseExportRawDataMaxThreads = 2
	ClickhouseExportRawDataTimeout    = 10 * time.Minute
)
