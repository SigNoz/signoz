import {
	AddHttpDrain,
	CheckServiceStatus,
	CloneRepo,
	ConfigureAws,
	ConfigureHostmetricsJSON,
	ConfigureMetricsReceiver,
	ConfigureReceiver,
	CreateDaemonService,
	CreateHttpPayload,
	CreateOtelConfig,
	CreateSidecarCollectorContainer,
	DataSourceStep,
	DeployTaskDefinition,
	EcsSendData,
	EcsSendLogsData,
	EnvDetailsStep,
	InstallOpenTelemetryStep,
	LogsTestConnectionStep,
	MonitorDashboard,
	PlotMetrics,
	RestartOtelCollector,
	RunApplicationStep,
	SelectMethodStep,
	SendLogsCloudwatch,
	SetupDaemonService,
	SetupLogDrains,
	SetupOtelCollectorStep,
	StartContainer,
	TestConnectionStep,
} from '../constants/stepsConfig';
import { ModuleProps, SelectedModuleStepProps } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';

interface GetStepsProps {
	selectedModule?: ModuleProps;
	selectedDataSource: DataSourceType | null;
}

export const APM_STEPS: SelectedModuleStepProps[] = [
	DataSourceStep,
	EnvDetailsStep,
	SelectMethodStep,
	SetupOtelCollectorStep,
	InstallOpenTelemetryStep,
	RunApplicationStep,
	TestConnectionStep,
];

export const LOGS_MANAGEMENT_STEPS: SelectedModuleStepProps[] = [
	DataSourceStep,
];

export const INFRASTRUCTURE_MONITORING_STEPS: SelectedModuleStepProps[] = [
	DataSourceStep,
];

export const AWS_MONITORING_STEPS: SelectedModuleStepProps[] = [DataSourceStep];

export const getSteps = ({
	selectedDataSource,
}: GetStepsProps): SelectedModuleStepProps[] => {
	const { id: selectedDataSourceID = '' } = selectedDataSource as DataSourceType;

	switch (selectedDataSourceID) {
		case 'kubernetes':
			return [DataSourceStep, SetupOtelCollectorStep, LogsTestConnectionStep];

		case 'docker':
			return [DataSourceStep, CloneRepo, StartContainer, LogsTestConnectionStep];

		case 'syslogs':
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureReceiver,
				CheckServiceStatus,
			];

		case 'application_logs':
		case 'fluentD':
		case 'fluentBit':
		case 'logStash':
		case 'awsEc2ApplicationLogs':
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureReceiver,
				RestartOtelCollector,
			];
		case 'heroku':
			return [DataSourceStep, AddHttpDrain];
		case 'vercel':
			return [DataSourceStep, SetupLogDrains];
		case 'http':
			return [DataSourceStep, CreateHttpPayload];
		case 'cloudwatch':
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureAws,
				ConfigureReceiver,
				SendLogsCloudwatch,
			];

		case 'kubernetesInfraMetrics':
			return [DataSourceStep, SetupOtelCollectorStep, PlotMetrics];
		case 'hostMetrics':
		case 'awsEc2InfrastructureMetrics':
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureHostmetricsJSON,
			];
		case 'otherMetrics':
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureMetricsReceiver,
			];
		case 'awsEcsExternal':
		case 'awsEcsEc2':
			return [
				DataSourceStep,
				SetupDaemonService,
				CreateOtelConfig,
				CreateDaemonService,
				EcsSendData,
			];

		case 'awsEcsFargate':
			return [
				DataSourceStep,
				CreateOtelConfig,
				CreateSidecarCollectorContainer,
				DeployTaskDefinition,
				EcsSendData,
				EcsSendLogsData,
			];
		case 'awsEks':
			return [DataSourceStep, SetupOtelCollectorStep, MonitorDashboard];

		default:
			return [DataSourceStep];
	}
};
