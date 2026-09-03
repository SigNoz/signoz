package querybuilder

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

// CompileScope carries the compile-time context of one query as one value: the org
// and the time range every physical read (evolution selection, probes) needs.
// The generic term and column compilers thread it instead of loose
// positional parameters, so a dropped axis is a compile error.
type CompileScope struct {
	OrgID   valuer.UUID
	StartNs uint64
	EndNs   uint64
}
