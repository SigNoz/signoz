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

	ListNotificationChannels(http.ResponseWriter, *http.Request)

	GetNotificationChannel(http.ResponseWriter, *http.Request)

	CreateNotificationChannel(http.ResponseWriter, *http.Request)

	UpdateNotificationChannel(http.ResponseWriter, *http.Request)

	DeleteNotificationChannel(http.ResponseWriter, *http.Request)

	TestNotificationChannel(http.ResponseWriter, *http.Request)

	GetAllRoutePolicies(http.ResponseWriter, *http.Request)

	GetRoutePolicyByID(http.ResponseWriter, *http.Request)

	CreateRoutePolicy(http.ResponseWriter, *http.Request)

	UpdateRoutePolicy(http.ResponseWriter, *http.Request)

	DeleteRoutePolicyByID(http.ResponseWriter, *http.Request)
}
