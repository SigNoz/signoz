package rules

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
)

func TestTemplateExpander(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service.name": "my-service"}, "100", "200")
	expander := NewTemplateExpander(context.Background(), defs+"test $service.name", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service", result)
}
