package signoz

import (
	"reflect"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/emailing/emailingtest"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/stretchr/testify/assert"
)

// This is a test to ensure that all fields of the modules are initialized.
// It also helps us catch these errors at compile time instead of runtime.
func TestNewModules(t *testing.T) {
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	providerSettings := factorytest.NewSettings()
	userModule := impluser.NewModule(impluser.NewStore(sqlstore), jwt, emailing, providerSettings)

	modules := NewModules(sqlstore, userModule)

	reflectVal := reflect.ValueOf(modules)
	for i := 0; i < reflectVal.NumField(); i++ {
		f := reflectVal.Field(i)
		assert.False(t, f.IsZero(), "%s module has not been initialized", reflectVal.Type().Field(i).Name)
	}
}
