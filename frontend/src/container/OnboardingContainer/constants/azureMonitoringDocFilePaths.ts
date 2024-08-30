import AzureMonitoring_azureAks_setupCentralCollector from '../Modules/AzureMonitoring/AKS/aks-installCentralCollector.md';
import AzureMonitoring_azureAks_sendLogs from '../Modules/AzureMonitoring/AKS/aks-logs.md';
import AzureMonitoring_azureAks_sendMetrics from '../Modules/AzureMonitoring/AKS/aks-metrics.md';
import AzureMonitoring_azureAks_setupAzureEventsHub from '../Modules/AzureMonitoring/AKS/aks-setupEventsHub.md';
import AzureMonitoring_azureAks_sendTraces from '../Modules/AzureMonitoring/AKS/aks-tracing.md';
// Azure App Service
import AzureMonitoring_azureAppService_setupCentralCollector from '../Modules/AzureMonitoring/AppService/appService-installCentralCollector.md';
import AzureMonitoring_azureAppService_sendLogs from '../Modules/AzureMonitoring/AppService/appService-logs.md';
import AzureMonitoring_azureAppService_sendMetrics from '../Modules/AzureMonitoring/AppService/appService-metrics.md';
import AzureMonitoring_azureAppService_setupAzureEventsHub from '../Modules/AzureMonitoring/AppService/appService-setupEventsHub.md';
import AzureMonitoring_azureAppService_sendTraces from '../Modules/AzureMonitoring/AppService/appService-tracing.md';
// Azure Blob Storage
import AzureMonitoring_azureBlobStorage_setupCentralCollector from '../Modules/AzureMonitoring/BlobStorage/blobStorage-installCentralCollector.md';
import AzureMonitoring_azureBlobStorage_sendLogs from '../Modules/AzureMonitoring/BlobStorage/blobStorage-logs.md';
import AzureMonitoring_azureBlobStorage_sendMetrics from '../Modules/AzureMonitoring/BlobStorage/blobStorage-metrics.md';
import AzureMonitoring_azureBlobStorage_setupAzureEventsHub from '../Modules/AzureMonitoring/BlobStorage/blobStorage-setupEventsHub.md';
// Azure Container Apps
import AzureMonitoring_azureContainerApps_setupCentralCollector from '../Modules/AzureMonitoring/ContainerApps/containerApps-installCentralCollector.md';
import AzureMonitoring_azureContainerApps_sendLogs from '../Modules/AzureMonitoring/ContainerApps/containerApps-logs.md';
import AzureMonitoring_azureContainerApps_sendMetrics from '../Modules/AzureMonitoring/ContainerApps/containerApps-metrics.md';
import AzureMonitoring_azureContainerApps_setupAzureEventsHub from '../Modules/AzureMonitoring/ContainerApps/containerApps-setupEventsHub.md';
import AzureMonitoring_azureContainerApps_sendTraces from '../Modules/AzureMonitoring/ContainerApps/containerApps-tracing.md';
// Azure Functions
import AzureMonitoring_azureFunctions_setupCentralCollector from '../Modules/AzureMonitoring/Functions/functions-installCentralCollector.md';
import AzureMonitoring_azureFunctions_sendLogs from '../Modules/AzureMonitoring/Functions/functions-logs.md';
import AzureMonitoring_azureFunctions_sendMetrics from '../Modules/AzureMonitoring/Functions/functions-metrics.md';
import AzureMonitoring_azureFunctions_setupAzureEventsHub from '../Modules/AzureMonitoring/Functions/functions-setupEventsHub.md';
import AzureMonitoring_azureFunctions_sendTraces from '../Modules/AzureMonitoring/Functions/functions-tracing.md';
// Azure SQL Database Metrics
import AzureMonitoring_azureSQLDatabaseMetrics_setupCentralCollector from '../Modules/AzureMonitoring/SqlDatabaseMetrics/sqlDatabaseMetrics-installCentralCollector.md';
import AzureMonitoring_azureSQLDatabaseMetrics_sendMetrics from '../Modules/AzureMonitoring/SqlDatabaseMetrics/sqlDatabaseMetrics-metrics.md';
import AzureMonitoring_azureSQLDatabaseMetrics_setupAzureEventsHub from '../Modules/AzureMonitoring/SqlDatabaseMetrics/sqlDatabaseMetrics-setupEventsHub.md';
import AzureMonitoring_azureVm_sendHostmetricsLogs from '../Modules/AzureMonitoring/Vm/vm-hostmetrics-and-logs.md';
// Azure VM
import AzureMonitoring_azureVm_setupCentralCollector from '../Modules/AzureMonitoring/Vm/vm-installCentralCollector.md';
import AzureMonitoring_azureVm_setupAzureEventsHub from '../Modules/AzureMonitoring/Vm/vm-setupEventsHub.md';

export const AzureMonitoringDocFilePaths = {
	// Azure  AKS
	AzureMonitoring_azureAks_setupCentralCollector,
	AzureMonitoring_azureAks_setupAzureEventsHub,
	AzureMonitoring_azureAks_sendTraces,
	AzureMonitoring_azureAks_sendLogs,
	AzureMonitoring_azureAks_sendMetrics,

	// Azure App Service
	AzureMonitoring_azureFunctions_setupCentralCollector,
	AzureMonitoring_azureFunctions_setupAzureEventsHub,
	AzureMonitoring_azureFunctions_sendTraces,
	AzureMonitoring_azureFunctions_sendLogs,
	AzureMonitoring_azureFunctions_sendMetrics,

	// Azure Functions
	AzureMonitoring_azureAppService_setupCentralCollector,
	AzureMonitoring_azureAppService_setupAzureEventsHub,
	AzureMonitoring_azureAppService_sendTraces,
	AzureMonitoring_azureAppService_sendLogs,
	AzureMonitoring_azureAppService_sendMetrics,

	// Azure Container Apps
	AzureMonitoring_azureContainerApps_setupCentralCollector,
	AzureMonitoring_azureContainerApps_setupAzureEventsHub,
	AzureMonitoring_azureContainerApps_sendTraces,
	AzureMonitoring_azureContainerApps_sendLogs,
	AzureMonitoring_azureContainerApps_sendMetrics,

	// Azure VM
	AzureMonitoring_azureVm_setupCentralCollector,
	AzureMonitoring_azureVm_setupAzureEventsHub,
	AzureMonitoring_azureVm_sendHostmetricsLogs,

	// Azure SQL Database Metrics
	AzureMonitoring_azureSQLDatabaseMetrics_setupCentralCollector,
	AzureMonitoring_azureSQLDatabaseMetrics_setupAzureEventsHub,
	AzureMonitoring_azureSQLDatabaseMetrics_sendMetrics,

	// Azure Blob Storage
	AzureMonitoring_azureBlobStorage_setupCentralCollector,
	AzureMonitoring_azureBlobStorage_setupAzureEventsHub,
	AzureMonitoring_azureBlobStorage_sendLogs,
	AzureMonitoring_azureBlobStorage_sendMetrics,
};
