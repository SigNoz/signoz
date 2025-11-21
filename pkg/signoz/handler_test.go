package signoz

import (
	"context"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager"
	"github.com/SigNoz/signoz/pkg/emailing/emailingtest"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/tokenizer/tokenizertest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// This is a test to ensure that all fields of the handlers are initialized.
// It also helps us catch these errors at compile time instead of runtime.
func TestNewHandlers(t *testing.T) {
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	providerSettings := factorytest.NewSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(t, err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlstore), sharder)
	notificationManager := nfmanagertest.NewMock()
	require.NoError(t, err)
	alertmanager, err := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{}, sqlstore, orgGetter, notificationManager)
	require.NoError(t, err)
	tokenizer := tokenizertest.New()
	emailing := emailingtest.New()
	modules := NewModules(sqlstore, tokenizer, emailing, providerSettings, orgGetter, alertmanager, nil, nil, nil, nil, nil)

	handlers := NewHandlers(modules, providerSettings, nil, nil)

	reflectVal := reflect.ValueOf(handlers)
	for i := 0; i < reflectVal.NumField(); i++ {
		f := reflectVal.Field(i)
		assert.False(t, f.IsZero(), "%s handler has not been initialized", reflectVal.Type().Field(i).Name)
	}
}
