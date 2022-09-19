package interfaces

import (
	baseint "go.signoz.io/query-service/interfaces"
)

// QueryBackend defines methods for interaction
// with o11y data. for example - clickhouse
type QueryBackend interface {
	Start(readerReady chan bool)
	baseint.Reader
}
