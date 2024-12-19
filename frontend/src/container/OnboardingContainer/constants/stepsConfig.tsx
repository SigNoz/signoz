import { SelectedModuleStepProps } from '../OnboardingContainer';
import ConnectionStatus from '../Steps/ConnectionStatus/ConnectionStatus';
import DataSource from '../Steps/DataSource/DataSource';
import EnvironmentDetails from '../Steps/EnvironmentDetails/EnvironmentDetails';
import LogsConnectionStatus from '../Steps/LogsConnectionStatus/LogsConnectionStatus';
import MarkdownStep from '../Steps/MarkdownStep/MarkdownStep';
import SelectMethod from '../Steps/SelectMethod/SelectMethod';

export const stepsMap = {
	dataSource: 'dataSource',
	environmentDetails: 'environmentDetails',
	selectMethod: 'selectMethod',
	setupOtelCollector: 'setupOtelCollector',
	instrumentApplication: 'instrumentApplication',
	cloneRepository: 'cloneRepository',
	startContainer: 'startContainer',
	runApplication: 'runApplication',
	testConnection: 'testConnection',
	configureReceiver: 'configureReceiver',
	checkServiceStatus: 'checkServiceStatus',
	restartOtelCollector: 'restartOtelCollector',
	plotMetrics: 'plotMetrics',
	configureHostmetricsJson: 'configureHostmetricsJson',
	configureMetricsReceiver: 'configureMetricsReceiver',
	addHttpDrain: 'addHttpDrain',
	setupLogDrains: `setupLogDrains`,
	createHttpPayload: `createHttpPayload`,
	configureAws: `configureAws`,
	sendLogsCloudwatch: `sendLogsCloudwatch`,
	setupDaemonService: `setupDaemonService`,
	createOtelConfig: `createOtelConfig`,
	createDaemonService: `createDaemonService`,
	ecsSendData: `ecsSendData`,
	createSidecarCollectorContainer: `createSidecarCollectorContainer`,
	deployTaskDefinition: `deployTaskDefinition`,
	ecsSendLogsData: `ecsSendLogsData`,
	monitorDashboard: `monitorDashboard`,
	setupCentralCollector: `setupCentralCollector`,
	setupAzureEventsHub: `setupAzureEventsHub`,
	sendTraces: `sendTraces`,
	sendLogs: `sendLogs`,
	sendMetrics: `sendMetrics`,
	sendHostmetricsLogs: `sendHostmetricsLogs`,
};

export const DataSourceStep: SelectedModuleStepProps = {
	id: stepsMap.dataSource,
	title: 'Data Source',
	component: <DataSource />,
};

export const EnvDetailsStep: SelectedModuleStepProps = {
	id: stepsMap.environmentDetails,
	title: 'Environment Details',
	component: <EnvironmentDetails />,
};

export const SelectMethodStep: SelectedModuleStepProps = {
	id: stepsMap.selectMethod,
	title: 'Select Method',
	component: <SelectMethod />,
};

export const SetupOtelCollectorStep: SelectedModuleStepProps = {
	id: stepsMap.setupOtelCollector,
	title: 'Setup Otel Collector',
	component: <MarkdownStep />,
};

export const InstallOpenTelemetryStep: SelectedModuleStepProps = {
	id: stepsMap.instrumentApplication,
	title: 'Instrument Application',
	component: <MarkdownStep />,
};

export const CloneRepo: SelectedModuleStepProps = {
	id: stepsMap.cloneRepository,
	title: 'Clone Repository',
	component: <MarkdownStep />,
};

export const StartContainer: SelectedModuleStepProps = {
	id: stepsMap.startContainer,
	title: 'Start Container',
	component: <MarkdownStep />,
};

export const RunApplicationStep: SelectedModuleStepProps = {
	id: stepsMap.runApplication,
	title: 'Run Application',
	component: <MarkdownStep />,
};

export const TestConnectionStep: SelectedModuleStepProps = {
	id: stepsMap.testConnection,
	title: 'Test Connection',
	component: <ConnectionStatus />,
};

export const LogsTestConnectionStep: SelectedModuleStepProps = {
	id: stepsMap.testConnection,
	title: 'Test Connection',
	component: <LogsConnectionStatus />,
};

export const ConfigureReceiver: SelectedModuleStepProps = {
	id: stepsMap.configureReceiver,
	title: 'Configure Receiver',
	component: <MarkdownStep />,
};

export const CheckServiceStatus: SelectedModuleStepProps = {
	id: stepsMap.checkServiceStatus,
	title: 'Check Service Status',
	component: <MarkdownStep />,
};

export const RestartOtelCollector: SelectedModuleStepProps = {
	id: stepsMap.restartOtelCollector,
	title: 'Restart Otel Collector',
	component: <MarkdownStep />,
};

export const PlotMetrics: SelectedModuleStepProps = {
	id: stepsMap.plotMetrics,
	title: 'Plot Metrics',
	component: <MarkdownStep />,
};

export const ConfigureHostmetricsJSON: SelectedModuleStepProps = {
	id: stepsMap.configureHostmetricsJson,
	title: 'Configure Hostmetrics JSON',
	component: <MarkdownStep />,
};

export const ConfigureMetricsReceiver: SelectedModuleStepProps = {
	id: stepsMap.configureMetricsReceiver,
	title: 'Configure Metrics Receiver',
	component: <MarkdownStep />,
};

export const AddHttpDrain: SelectedModuleStepProps = {
	id: stepsMap.addHttpDrain,
	title: 'Add HTTP Drain',
	component: <MarkdownStep />,
};

export const SetupLogDrains: SelectedModuleStepProps = {
	id: stepsMap.setupLogDrains,
	title: 'Setup Log Drains',
	component: <MarkdownStep />,
};

export const CreateHttpPayload: SelectedModuleStepProps = {
	id: stepsMap.createHttpPayload,
	title: 'Create Json Payload',
	component: <MarkdownStep />,
};

export const ConfigureAws: SelectedModuleStepProps = {
	id: stepsMap.configureAws,
	title: 'Configure AWS',
	component: <MarkdownStep />,
};
export const SendLogsCloudwatch: SelectedModuleStepProps = {
	id: stepsMap.sendLogsCloudwatch,
	title: 'Send Logs',
	component: <MarkdownStep />,
};
export const SetupDaemonService: SelectedModuleStepProps = {
	id: stepsMap.setupDaemonService,
	title: 'Setup Daemon Service',
	component: <MarkdownStep />,
};
export const CreateOtelConfig: SelectedModuleStepProps = {
	id: stepsMap.createOtelConfig,
	title: 'Create OTel Config',
	component: <MarkdownStep />,
};
export const CreateDaemonService: SelectedModuleStepProps = {
	id: stepsMap.createDaemonService,
	title: 'Create Daemon Service',
	component: <MarkdownStep />,
};
export const EcsSendData: SelectedModuleStepProps = {
	id: stepsMap.ecsSendData,
	title: 'Send Traces Data',
	component: <MarkdownStep />,
};
export const CreateSidecarCollectorContainer: SelectedModuleStepProps = {
	id: stepsMap.createSidecarCollectorContainer,
	title: 'Create Sidecar Collector',
	component: <MarkdownStep />,
};
export const DeployTaskDefinition: SelectedModuleStepProps = {
	id: stepsMap.deployTaskDefinition,
	title: 'Deploy Task Definition',
	component: <MarkdownStep />,
};
export const EcsSendLogsData: SelectedModuleStepProps = {
	id: stepsMap.ecsSendLogsData,
	title: 'Send Logs Data',
	component: <MarkdownStep />,
};
export const MonitorDashboard: SelectedModuleStepProps = {
	id: stepsMap.monitorDashboard,
	title: 'Monitor using Dashboard ',
	component: <MarkdownStep />,
};
export const SetupCentralCollectorStep: SelectedModuleStepProps = {
	id: stepsMap.setupCentralCollector,
	title: 'Setup Central Collector ',
	component: <MarkdownStep />,
};
export const SetupAzureEventsHub: SelectedModuleStepProps = {
	id: stepsMap.setupAzureEventsHub,
	title: 'Setup EventsHub',
	component: <MarkdownStep />,
};
export const SendTraces: SelectedModuleStepProps = {
	id: stepsMap.sendTraces,
	title: 'Send Traces',
	component: <MarkdownStep />,
};
export const SendLogs: SelectedModuleStepProps = {
	id: stepsMap.sendLogs,
	title: 'Send Logs',
	component: <MarkdownStep />,
};
export const SendMetrics: SelectedModuleStepProps = {
	id: stepsMap.sendMetrics,
	title: 'Send Metrics',
	component: <MarkdownStep />,
};
export const SendHostmetricsLogs: SelectedModuleStepProps = {
	id: stepsMap.sendHostmetricsLogs,
	title: 'HostMetrics and Logging',
	component: <MarkdownStep />,
};
