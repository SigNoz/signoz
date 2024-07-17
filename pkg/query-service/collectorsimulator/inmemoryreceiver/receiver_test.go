package inmemoryreceiver

import (
	"context"
	"go.uber.org/zap"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/receiver"
)

func TestReceiverLifecycle(t *testing.T) {
	req := require.New(t)
	testReceiverId := uuid.NewString()

	// Should be able to get a hold of the receiver after starting it.
	req.Nil(GetReceiverInstance(testReceiverId), "receiver instance should not exist before Start()")

	constructed, err := makeTestLogReceiver(testReceiverId)
	req.Nil(err, "could not make test receiver")

	err = constructed.Start(context.Background(), componenttest.NewNopHost())
	req.Nil(err, "could not start test receiver")

	testReceiver := GetReceiverInstance(testReceiverId)
	req.NotNil(testReceiver, "could not get receiver instance by Id")

	// Should not be able to start 2 receivers with the same id
	constructed2, err := makeTestLogReceiver(testReceiverId)
	req.Nil(err, "could not create second receiver with same id")

	err = constructed2.Start(context.Background(), componenttest.NewNopHost())
	req.NotNil(err, "should not be able to start another receiver with same id before shutting down the previous one")

	// Should not be able to get a hold of an receiver after shutdown
	err = testReceiver.Shutdown(context.Background())
	if err != nil {
		zap.L().Error("Error shutting down receiver", zap.Error(err))
		return
	}
	req.Nil(GetReceiverInstance(testReceiverId), "should not be able to find inmemory receiver after shutdown")

	// Should be able to start a new receiver with same id after shutting down
	constructed3, err := makeTestLogReceiver(testReceiverId)
	req.Nil(err, "could not make receiver with same Id after shutting down old one")

	err = constructed3.Start(context.Background(), componenttest.NewNopHost())
	req.Nil(err, "should be able to start another receiver with same id after shutting down the previous one")

	testReceiver3 := GetReceiverInstance(testReceiverId)
	req.NotNil(testReceiver3, "could not get receiver instance by Id")

	err = testReceiver3.Shutdown(context.Background())
	if err != nil {
		zap.L().Error("Error shutting down receiver", zap.Error(err))
		return
	}
	req.Nil(GetReceiverInstance(testReceiverId))
}

func makeTestLogReceiver(receiverId string) (receiver.Logs, error) {
	factory := NewFactory()

	cfg := factory.CreateDefaultConfig()
	err := component.UnmarshalConfig(confmap.NewFromStringMap(
		map[string]interface{}{"id": receiverId}), cfg,
	)
	if err != nil {
		zap.L().Error("Error unmarshalling config", zap.Error(err))
		return nil, err
	}

	return factory.CreateLogsReceiver(
		context.Background(), receiver.CreateSettings{}, cfg, consumertest.NewNop(),
	)
}
