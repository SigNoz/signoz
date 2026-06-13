package implrawdataexport

import (
	"time"
)

const (
	// Row Limits.
	MaxExportRowCountLimit     = 50_000 // 50k — applies to logs/metrics
	DefaultExportRowCountLimit = 10_000 // 10k

	// Higher ceiling for trace exports. Full-trace download needs to enumerate
	// every span; a single big trace can easily exceed 50k. The 10 GB byte cap
	// and ClickhouseExportRawDataTimeout still apply as backstops.
	MaxExportRowCountLimitTraces = 2_000_000 // 2M

	// Data Limits.
	MaxExportBytesLimit = 10 * 1024 * 1024 * 1024 // 10 GB

	// Query Limits.
	ChunkSize                         = 5_000 // 5k
	ClickhouseExportRawDataMaxThreads = 2
	ClickhouseExportRawDataTimeout    = 10 * time.Minute
)
