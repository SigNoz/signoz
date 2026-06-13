package implrawdataexport

import (
	"time"
)

const (
	// Data Limits.
	MaxExportBytesLimit = 10 * 1024 * 1024 * 1024 // 10 GB

	// Query Limits.
	ChunkSize                         = 5_000 // 5k
	ClickhouseExportRawDataMaxThreads = 2
	ClickhouseExportRawDataTimeout    = 10 * time.Minute
)
