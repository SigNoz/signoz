package main

import (
	"github.com/SigNoz/signoz/ee/sqlschema/postgressqlschema"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
)

func sqlstoreProviderFactories() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]] {
	existingFactories := signoz.NewSQLStoreProviderFactories()
	if err := existingFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory(), sqlstorehook.NewInstrumentationFactory())); err != nil {
		panic(err)
	}

	return existingFactories
}

func sqlschemaProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
	existingFactories := signoz.NewSQLSchemaProviderFactories(sqlstore)
	if err := existingFactories.Add(postgressqlschema.NewFactory(sqlstore)); err != nil {
		panic(err)
	}

	return existingFactories
}
