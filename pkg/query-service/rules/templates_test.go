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

func TestTemplateExpander_WithThreshold(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service.name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test $service.name exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service exceeds 100 and observed at 200", result)
}

func TestTemplateExpanderOldVariableSyntax(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service.name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test {{.Labels.service_name}} exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service exceeds 100 and observed at 200", result)
}

func TestTemplateExpander_WithAlreadyNormalizedKey(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service_name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test {{.Labels.service_name}} exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service exceeds 100 and observed at 200", result)
}

func TestTemplateExpander_WithMissingKey(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service_name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test {{.Labels.missing_key}} exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test  exceeds 100 and observed at 200", result)
}

func TestTemplateExpander_WithLablesDotSyntax(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service.name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test {{.Labels.service.name}} exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service exceeds 100 and observed at 200", result)
}

func TestTemplateExpander_WithVariableSyntax(t *testing.T) {
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	data := AlertTemplateData(map[string]string{"service.name": "my-service"}, "200", "100")
	expander := NewTemplateExpander(context.Background(), defs+"test {{$service.name}} exceeds {{$threshold}} and observed at {{$value}}", "test", data, times.Time(time.Now().Unix()), nil)
	result, err := expander.Expand()
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, "test my-service exceeds 100 and observed at 200", result)
}
