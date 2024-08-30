package inmemoryexporter

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/exporter"
)

func TestExporterLifecycle(t *testing.T) {
	require := require.New(t)
	testExporterId := uuid.NewString()

	// Should be able to get a hold of the exporter after starting it.
	require.Nil(GetExporterInstance(testExporterId))

	constructed, err := makeTestExporter(testExporterId)
	require.Nil(err, "could not make test exporter")

	err = constructed.Start(context.Background(), componenttest.NewNopHost())
	require.Nil(err, "could not start test exporter")

	testExporter := GetExporterInstance(testExporterId)
	require.NotNil(testExporter, "could not get exporter instance by Id")

	// Should not be able to start 2 exporters with the same id
	constructed2, err := makeTestExporter(testExporterId)
	require.Nil(err, "could not create second exporter with same id")

	err = constructed2.Start(context.Background(), componenttest.NewNopHost())
	require.NotNil(err, "should not be able to start another exporter with same id before shutting down the previous one")

	// Should not be able to get a hold of an exporter after shutdown
	testExporter.Shutdown(context.Background())
	require.Nil(GetExporterInstance(testExporterId), "should not be able to find exporter instance after shutdown")

	// Should be able to start a new exporter with same id after shutting down
	constructed3, err := makeTestExporter(testExporterId)
	require.Nil(err, "could not make exporter with same Id after shutting down previous one")

	err = constructed3.Start(context.Background(), componenttest.NewNopHost())
	require.Nil(err, "should be able to start another exporter with same id after shutting down the previous one")

	testExporter3 := GetExporterInstance(testExporterId)
	require.NotNil(testExporter3, "could not get exporter instance by Id")

	testExporter3.Shutdown(context.Background())
	require.Nil(GetExporterInstance(testExporterId))
}

func makeTestExporter(exporterId string) (exporter.Logs, error) {
	factory := NewFactory()

	cfg := factory.CreateDefaultConfig()
	confmap.NewFromStringMap(map[string]any{"id": exporterId}).Unmarshal(&cfg)

	return factory.CreateLogsExporter(
		context.Background(), exporter.CreateSettings{}, cfg,
	)
}
