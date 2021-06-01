package main

import (
	"fmt"
	"os"

	"go.signoz.io/query-service/test/clickhouse"
	"go.signoz.io/query-service/test/druid"
)

type StorageReader interface {
	GetServices() string
}

func main() {
	storage := os.Getenv("STORAGE")
	var client StorageReader

	if storage == "druid" {
		client = druid.NewSpanReader()
	} else if storage == "clickhouse" {
		client = clickhouse.NewSpanReader()
	}

	services := client.GetServices()
	fmt.Println(services)
}
