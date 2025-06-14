package interfaces

import (
	baseint "github.com/SigNoz/signoz/pkg/query-service/interfaces"
)

// Connector defines methods for interaction
// with o11y data. for example - clickhouse
type DataConnector interface {
	baseint.Reader
}
