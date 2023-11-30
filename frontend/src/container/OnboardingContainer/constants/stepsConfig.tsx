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
