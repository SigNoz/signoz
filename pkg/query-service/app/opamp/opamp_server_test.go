package opamp

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/stretchr/testify/require"
)

func TestOnMessageRejectsInvalidInstanceUID(t *testing.T) {
	tests := []struct {
		name        string
		instanceUID []byte
	}{
		{
			name: "missing instance UID",
		},
		{
			name:        "short instance UID",
			instanceUID: []byte("too-short"),
		},
		{
			name:        "long instance UID",
			instanceUID: []byte("longer-than-16-bytes"),
		},
		{
			name:        "zero instance UID",
			instanceUID: make([]byte, 16),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			srv := &Server{
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
			}
			msg := &protobufs.AgentToServer{InstanceUid: test.instanceUID}

			response := srv.OnMessage(context.Background(), nil, msg)

			require.Equal(t, test.instanceUID, response.GetInstanceUid())
			require.NotNil(t, response.GetErrorResponse())
			require.Equal(
				t,
				protobufs.ServerErrorResponseType_ServerErrorResponseType_BadRequest,
				response.GetErrorResponse().GetType(),
			)
			require.Equal(t, "instance UID must be a non-zero 16-byte value", response.GetErrorResponse().GetErrorMessage())
		})
	}
}
