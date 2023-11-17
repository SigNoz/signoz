import {
	CheckServiceStatus,
	CloneRepo,
	ConfigureHostmetricsJSON,
	ConfigureMetricsReceiver,
	ConfigureReceiver,
	DataSourceStep,
	EnvDetailsStep,
	InstallOpenTelemetryStep,
	LogsTestConnectionStep,
	PlotMetrics,
	RestartOtelCollector,
	RunApplicationStep,
	SelectMethodStep,
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
			return [
				DataSourceStep,
				EnvDetailsStep,
				SetupOtelCollectorStep,
				ConfigureReceiver,
				RestartOtelCollector,
			];

		case 'kubernetesInfraMetrics':
			return [DataSourceStep, SetupOtelCollectorStep, PlotMetrics];
		case 'hostMetrics':
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
		default:
			return [DataSourceStep];
	}
};
