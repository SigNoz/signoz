package main

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

func sqlstoreProviderFactories() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]] {
	return signoz.NewSQLStoreProviderFactories()
}

func sqlschemaProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
	return signoz.NewSQLSchemaProviderFactories(sqlstore)
}
