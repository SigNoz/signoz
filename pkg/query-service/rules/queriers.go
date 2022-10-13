package rules

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	pqle "go.signoz.io/signoz/pkg/query-service/pqlEngine"
)

// Queriers register the options for querying metrics or event sources
// which return a condition that results in a alert. Currently we support
// promql engine and clickhouse queries but in future we may include
// api readers for Machine Learning (ML) use cases.
// Note: each rule will pick up the querier it is interested in
// and use it. This allows rules to have flexibility in choosing
// the query engines.
type Queriers struct {
	// promql engine
	PqlEngine *pqle.PqlEngine

	// metric querier
	Ch clickhouse.Conn
}
