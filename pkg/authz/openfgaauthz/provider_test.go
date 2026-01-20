package openfgaauthz

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
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "postgres"}, sqlmock.QueryMatcherRegexp)

	expectedModel := `module base 
	type user`
	provider, err := newOpenfgaProvider(context.Background(), providerSettings, authz.Config{}, sqlstore, []transformer.ModuleFile{{Name: "test.fga", Contents: expectedModel}})
	require.NoError(t, err)

	storeRows := sqlstore.Mock().NewRows([]string{"id", "name", "created_at", "updated_at"}).AddRow("01K3V0NTN47MPTMEV1PD5ST6ZC", "signoz", time.Now(), time.Now())
	sqlstore.Mock().ExpectQuery("SELECT (.+) FROM store WHERE (.+)").WillReturnRows(storeRows)

	authModelCollectionRows := sqlstore.Mock().NewRows([]string{"authorization_model_id"}).AddRow("01K44QQKXR6F729W160NFCJT58")
	sqlstore.Mock().ExpectQuery("SELECT DISTINCT (.+)  FROM authorization_model WHERE store (.+) ORDER BY (.+)").WillReturnRows(authModelCollectionRows)

	modelRows := sqlstore.Mock().NewRows([]string{"authorization_model_id", "schema_version", "type", "type_definition", "serialized_protobuf"}).
		AddRow("01K44QQKXR6F729W160NFCJT58", "1.1", "", "", "")
	sqlstore.Mock().ExpectQuery("SELECT authorization_model_id, schema_version, type, type_definition, serialized_protobuf FROM authorization_model WHERE authorization_model_id = (.+)  AND store = (.+)").WithArgs("01K44QQKXR6F729W160NFCJT58", "01K3V0NTN47MPTMEV1PD5ST6ZC").WillReturnRows(modelRows)

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
