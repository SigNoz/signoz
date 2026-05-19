package o11y

import (
	"context"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/hanzoai/o11y/pkg/alertmanager"
	"github.com/hanzoai/o11y/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/hanzoai/o11y/pkg/alertmanager/o11yalertmanager"
	"github.com/hanzoai/o11y/pkg/emailing/emailingtest"
	"github.com/hanzoai/o11y/pkg/factory/factorytest"
	"github.com/hanzoai/o11y/pkg/flagger"
	"github.com/hanzoai/o11y/pkg/instrumentation/instrumentationtest"
	"github.com/hanzoai/o11y/pkg/modules/dashboard/impldashboard"
	"github.com/hanzoai/o11y/pkg/modules/organization/implorganization"
	"github.com/hanzoai/o11y/pkg/modules/user/impluser"
	"github.com/hanzoai/o11y/pkg/queryparser"
	"github.com/hanzoai/o11y/pkg/sharder"
	"github.com/hanzoai/o11y/pkg/sharder/noopsharder"
	"github.com/hanzoai/o11y/pkg/sqlstore"
	"github.com/hanzoai/o11y/pkg/sqlstore/sqlstoretest"
	"github.com/hanzoai/o11y/pkg/tokenizer/tokenizertest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// This is a test to ensure that all fields of the modules are initialized.
// It also helps us catch these errors at compile time instead of runtime.
func TestNewModules(t *testing.T) {
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	providerSettings := factorytest.NewSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(t, err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlstore), sharder)
	notificationManager := nfmanagertest.NewMock()
	require.NoError(t, err)
	alertmanager, err := o11yalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{}, sqlstore, orgGetter, notificationManager)
	require.NoError(t, err)
	tokenizer := tokenizertest.NewMockTokenizer(t)
	emailing := emailingtest.New()
	queryParser := queryparser.New(providerSettings)
	require.NoError(t, err)
	dashboardModule := impldashboard.NewModule(impldashboard.NewStore(sqlstore), providerSettings, nil, orgGetter, queryParser)

	flagger, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	require.NoError(t, err)

	userGetter := impluser.NewGetter(impluser.NewStore(sqlstore, providerSettings), flagger)

	modules := NewModules(sqlstore, tokenizer, emailing, providerSettings, orgGetter, alertmanager, nil, nil, nil, nil, nil, nil, nil, queryParser, Config{}, dashboardModule, userGetter)

	reflectVal := reflect.ValueOf(modules)
	for i := 0; i < reflectVal.NumField(); i++ {
		f := reflectVal.Field(i)
		assert.False(t, f.IsZero(), "%s module has not been initialized", reflectVal.Type().Field(i).Name)
	}
}
