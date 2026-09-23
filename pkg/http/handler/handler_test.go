package handler

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/swaggest/openapi-go/openapi3"
)

func TestServeOpenAPIStability(t *testing.T) {
	testCases := []struct {
		subtestName            string
		stability              Stability
		expectedExtensionValue any
	}{
		{
			subtestName:            "beta is emitted as x-stability",
			stability:              StabilityBeta,
			expectedExtensionValue: "beta",
		},
		{
			subtestName:            "alpha is emitted as x-stability",
			stability:              StabilityAlpha,
			expectedExtensionValue: "alpha",
		},
		{
			subtestName:            "unset is emitted as stable",
			stability:              Stability{},
			expectedExtensionValue: "stable",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.subtestName, func(t *testing.T) {
			reflector := openapi3.NewReflector()
			opCtx, err := reflector.NewOperationContext(http.MethodGet, "/test")
			require.NoError(t, err)

			New(func(http.ResponseWriter, *http.Request) {}, OpenAPIDef{
				ID:                "test",
				SuccessStatusCode: http.StatusOK,
				Stability:         testCase.stability,
			}).ServeOpenAPI(opCtx)
			require.NoError(t, reflector.AddOperation(opCtx))

			operation := reflector.Spec.Paths.MapOfPathItemValues["/test"].MapOfOperationValues["get"]
			assert.Equal(t, testCase.expectedExtensionValue, operation.MapOfAnything["x-stability"])
		})
	}
}
