package opamp

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"

	"github.com/open-telemetry/opamp-go/protobufs"
)

type receivedMessageHandler func(msg *protobufs.AgentToServer) *protobufs.ServerToAgent

type MockServer struct {
	t           *testing.T
	Endpoint    string
	OnRequest   func(w http.ResponseWriter, r *http.Request)
	OnConnect   func(r *http.Request)
	OnWSConnect func(conn *websocket.Conn)
	OnMessage   func(msg *protobufs.AgentToServer) *protobufs.ServerToAgent
	srv         *httptest.Server

	expectedHandlers  chan receivedMessageHandler
	expectedComplete  chan struct{}
	isExpectMode      bool
	enableCompression bool
}

const headerContentType = "Content-Type"
const contentTypeProtobuf = "application/x-protobuf"

func StartMockServer(t *testing.T) *MockServer {
	srv := &MockServer{
		t:                t,
		expectedHandlers: make(chan receivedMessageHandler, 0),
		expectedComplete: make(chan struct{}, 0),
	}

	m := http.NewServeMux()
	m.HandleFunc(
		"/", func(w http.ResponseWriter, r *http.Request) {
			if srv.OnRequest != nil {
				srv.OnRequest(w, r)
				return
			}

			if srv.OnConnect != nil {
				srv.OnConnect(r)
			}

			if r.Header.Get(headerContentType) == contentTypeProtobuf {
				srv.handlePlainHttp(w, r)
				return
			}

			srv.handleWebSocket(t, w, r)
		},
	)

	srv.srv = httptest.NewServer(m)

	u, err := url.Parse(srv.srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	srv.Endpoint = u.Host

	WaitForEndpoint(srv.Endpoint)

	return srv
}

// EnableExpectMode enables the expect mode that allows using Expect() method
// to describe what message is expected to be received.
func (m *MockServer) EnableExpectMode() {
	m.isExpectMode = true
}

func (m *MockServer) handlePlainHttp(w http.ResponseWriter, r *http.Request) {
	msgBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Fatal("cannot read:", err)
	}

	// We use alwaysRespond=true here because plain HTTP requests must always have
	// a response.
	msgBytes = m.handleReceivedBytes(msgBytes, true)
	if msgBytes != nil {
		// Send the response.
		w.Header().Set(headerContentType, contentTypeProtobuf)
		_, err = w.Write(msgBytes)
		if err != nil {
			log.Fatal("cannot send:", err)
		}
	}
}

func (m *MockServer) EnableCompression() {
	m.enableCompression = true
}

func (m *MockServer) handleWebSocket(t *testing.T, w http.ResponseWriter, r *http.Request) {
	var upgrader = websocket.Upgrader{
		EnableCompression: m.enableCompression,
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	if m.OnWSConnect != nil {
		m.OnWSConnect(conn)
	}
	for {
		var messageType int
		var msgBytes []byte
		if messageType, msgBytes, err = conn.ReadMessage(); err != nil {
			return
		}
		assert.EqualValues(t, websocket.BinaryMessage, messageType)

		if len(msgBytes) > 0 && msgBytes[0] == 0 {
			// New message format. The Protobuf message is preceded by a zero byte header.
			// Skip the zero byte.
			msgBytes = msgBytes[1:]
		}

		// We use alwaysRespond=false here because WebSocket requests must only have
		// a response when a response is provided by the user-defined handler.
		msgBytes = m.handleReceivedBytes(msgBytes, false)
		if msgBytes != nil {
			// Prepend zero-byte header.
			msgBytes = append([]byte{0}, msgBytes...)

			err = conn.WriteMessage(websocket.BinaryMessage, msgBytes)
			if err != nil {
				log.Fatal("cannot send:", err)
			}
		}
	}
}

func (m *MockServer) handleReceivedBytes(msgBytes []byte, alwaysRespond bool) []byte {
	var request protobufs.AgentToServer
	err := proto.Unmarshal(msgBytes, &request)
	if err != nil {
		log.Fatal("cannot decode:", err)
	}

	var response *protobufs.ServerToAgent

	if m.isExpectMode {
		// We are in expect mode. Call user-defined handler for the message.
		// Note that the user-defined handler may be supplied after we receive the message
		// so we wait for the user-defined handler to provided in the expectedHandlers
		// channel.
		t := time.NewTimer(5 * time.Second)
		select {
		case h := <-m.expectedHandlers:
			defer func() { m.expectedComplete <- struct{}{} }()
			response = h(&request)
		case <-t.C:
			m.t.Error("Time out waiting for Expect() to handle the received message")
		}
	} else if m.OnMessage != nil {
		// Not in expect mode, instead using OnMessage callback.
		response = m.OnMessage(&request)
	}

	if alwaysRespond && response == nil {
		// Return minimal response if the handler did not define the response, but
		// we have to return a response.
		response = &protobufs.ServerToAgent{
			InstanceUid: request.InstanceUid,
		}
	}

	if response != nil {
		msgBytes, err = proto.Marshal(response)
		if err != nil {
			log.Fatal("cannot encode:", err)
		}
	} else {
		msgBytes = nil
	}
	return msgBytes
}

// Expect defines a handler that will be called when a message is received. Expect
// must be called when we are certain that the message will be received (if it is not
// received a "time out" error will be recorded.
func (m *MockServer) Expect(handler receivedMessageHandler) {
	t := time.NewTimer(5 * time.Second)
	select {
	case m.expectedHandlers <- handler:
		// push the handler to the channel.
		// the handler will be fetched and called by handleReceivedBytes() when
		// message is received.
		<-m.expectedComplete

	case <-t.C:
		m.t.Error("Time out waiting to receive a message from the client")
	}
}

// EventuallyExpect expects to receive a message and calls the handler for every
// received message until eventually the handler returns true for the second
// element of the return tuple.
// Typically used when we know we expect to receive a particular message but 0 or more
// other messages may be received before that.
func (m *MockServer) EventuallyExpect(
	msg string,
	handler func(msg *protobufs.AgentToServer) (*protobufs.ServerToAgent, bool),
) {
	t := time.NewTimer(5 * time.Second)

	conditionCh := make(chan bool)
	wrappedHandler := func(msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
		response, condition := handler(msg)
		conditionCh <- condition
		return response
	}

	for {
		select {
		case m.expectedHandlers <- wrappedHandler:
			// push the handler to the channel.
			// the handler will be fetched and called by handleReceivedBytes() when
			// message is received.

			select {
			case condition := <-conditionCh:
				<-m.expectedComplete
				if condition {
					return
				}
			case <-t.C:
				m.t.Errorf("Time out expecting a message from the client: %v", msg)
				<-conditionCh
				<-m.expectedComplete
				return
			}

		case <-t.C:
			m.t.Errorf("Time out expecting a message from the client: %v", msg)
			return
		}
	}
}

func (m *MockServer) Close() {
	close(m.expectedHandlers)
	m.srv.Close()
}
