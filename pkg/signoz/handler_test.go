package signoz

import (
	"reflect"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/emailing/emailingtest"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/stretchr/testify/assert"
)

// This is a test to ensure that all fields of the handlers are initialized.
// It also helps us catch these errors at compile time instead of runtime.
func TestNewHandlers(t *testing.T) {
	sqlstore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	providerSettings := factorytest.NewSettings()

	modules := NewModules(sqlstore, jwt, emailing, providerSettings)
	handlers := NewHandlers(modules)

	reflectVal := reflect.ValueOf(handlers)
	for i := 0; i < reflectVal.NumField(); i++ {
		f := reflectVal.Field(i)
		assert.False(t, f.IsZero(), "%s handler has not been initialized", reflectVal.Type().Field(i).Name)
	}
}
