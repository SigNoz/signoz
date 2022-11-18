package interfaces

import (
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
)

// Connector defines methods for interaction
// with o11y data. for example - clickhouse
type DataConnector interface {
	Start(readerReady chan bool)
	baseint.Reader
}
