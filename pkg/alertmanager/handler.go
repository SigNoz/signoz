package alertmanager

import "net/http"

type Handler interface {
	GetAlerts(http.ResponseWriter, *http.Request)

	TestReceiver(http.ResponseWriter, *http.Request)

	ListChannels(http.ResponseWriter, *http.Request)

	ListAllChannels(http.ResponseWriter, *http.Request)

	GetChannelByID(http.ResponseWriter, *http.Request)

	CreateChannel(http.ResponseWriter, *http.Request)

	UpdateChannelByID(http.ResponseWriter, *http.Request)

	DeleteChannelByID(http.ResponseWriter, *http.Request)

	GetAllRoutePolicies(http.ResponseWriter, *http.Request)

	GetRoutePolicyByID(http.ResponseWriter, *http.Request)

	CreateRoutePolicy(http.ResponseWriter, *http.Request)

	UpdateRoutePolicy(http.ResponseWriter, *http.Request)

	DeleteRoutePolicyByID(http.ResponseWriter, *http.Request)
}
