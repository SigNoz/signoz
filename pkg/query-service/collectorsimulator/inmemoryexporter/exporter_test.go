package inmemoryexporter

import (
	"context"
	"go.uber.org/zap"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/exporter"
)

func TestExporterLifecycle(t *testing.T) {
	req := require.New(t)
	testExporterId := uuid.NewString()

	// Should be able to get a hold of the exporter after starting it.
	req.Nil(GetExporterInstance(testExporterId))

	constructed, err := makeTestExporter(testExporterId)
	req.Nil(err, "could not make test exporter")

	err = constructed.Start(context.Background(), componenttest.NewNopHost())
	req.Nil(err, "could not start test exporter")

	testExporter := GetExporterInstance(testExporterId)
	req.NotNil(testExporter, "could not get exporter instance by Id")

	// Should not be able to start 2 exporters with the same id
	constructed2, err := makeTestExporter(testExporterId)
	req.Nil(err, "could not create second exporter with same id")

	err = constructed2.Start(context.Background(), componenttest.NewNopHost())
	req.NotNil(err, "should not be able to start another exporter with same id before shutting down the previous one")

	// Should not be able to get a hold of an exporter after shutdown
	err = testExporter.Shutdown(context.Background())
	if err != nil {
		req.Nil(err, "could not shutdown exporter")
		return
	}
	req.Nil(GetExporterInstance(testExporterId), "should not be able to find exporter instance after shutdown")

	// Should be able to start a new exporter with same id after shutting down
	constructed3, err := makeTestExporter(testExporterId)
	req.Nil(err, "could not make exporter with same Id after shutting down previous one")

	err = constructed3.Start(context.Background(), componenttest.NewNopHost())
	req.Nil(err, "should be able to start another exporter with same id after shutting down the previous one")

	testExporter3 := GetExporterInstance(testExporterId)
	req.NotNil(testExporter3, "could not get exporter instance by Id")

	err = testExporter3.Shutdown(context.Background())
	if err != nil {
		req.Nil(err, "could not shutdown exporter")
		return
	}
	req.Nil(GetExporterInstance(testExporterId))
}

func makeTestExporter(exporterId string) (exporter.Logs, error) {
	factory := NewFactory()

	cfg := factory.CreateDefaultConfig()
	err := component.UnmarshalConfig(confmap.NewFromStringMap(
		map[string]interface{}{"id": exporterId}), cfg,
	)
	if err != nil {
		zap.L().Error("could not unmarshal config", zap.Error(err))
		return nil, err
	}

	return factory.CreateLogsExporter(
		context.Background(), exporter.CreateSettings{}, cfg,
	)
}
