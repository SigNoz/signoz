package openfgaserver

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/openfga/language/pkg/go/transformer"
	"github.com/stretchr/testify/require"
)

func TestProviderStartStop(t *testing.T) {
	providerSettings := instrumentationtest.New().ToProviderSettings()
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)

	openfgaDataStore, err := NewSQLStore(sqlstore, authz.Config{OpenFGA: authz.OpenFGAConfig{MaxTuplesPerWrite: 100}})
	require.NoError(t, err)

	expectedModel := `module base 
	type user`
	provider, err := NewOpenfgaServer(context.Background(), providerSettings, authz.Config{}, sqlstore, []transformer.ModuleFile{{Name: "test.fga", Contents: expectedModel}}, openfgaDataStore)
	require.NoError(t, err)

	storeRows := sqlstore.Mock().NewRows([]string{"id", "name", "created_at", "updated_at"}).AddRow("01K3V0NTN47MPTMEV1PD5ST6ZC", "signoz", time.Now(), time.Now())
	sqlstore.Mock().ExpectQuery("SELECT (.+) FROM store WHERE (.+)").WillReturnRows(storeRows)

	authModelRows := sqlstore.Mock().NewRows([]string{"authorization_model_id", "schema_version", "serialized_protobuf"}).
		AddRow("01K44QQKXR6F729W160NFCJT58", "1.1", []byte(""))
	sqlstore.Mock().ExpectQuery("SELECT (.+) FROM authorization_model WHERE (.+)").WillReturnRows(authModelRows)

	sqlstore.Mock().ExpectExec("INSERT INTO authorization_model (.+) VALUES (.+)").WillReturnResult(sqlmock.NewResult(1, 1))

	go func() {
		err := provider.Start(context.Background())
		require.NoError(t, err)
	}()
	// wait for the service to start
	time.Sleep(time.Second * 2)

	err = provider.Stop(context.Background())
	require.NoError(t, err)
}
