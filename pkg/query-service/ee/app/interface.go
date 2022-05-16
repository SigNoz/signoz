package app

import (
	baseApp "go.signoz.io/query-service/app"
)

type DatabaseReader interface {
	Start()
	baseApp.Reader
}
