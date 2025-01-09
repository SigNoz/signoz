package cloudintegrations

type CloudServicesController struct {
	availableServices AvailableServicesRepo
	configRepo        ServiceConfigRepo
}
