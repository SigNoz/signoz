import { SelectedModuleStepProps } from '../OnboardingContainer';
import ConnectionStatus from '../Steps/ConnectionStatus/ConnectionStatus';
import DataSource from '../Steps/DataSource/DataSource';
import EnvironmentDetails from '../Steps/EnvironmentDetails/EnvironmentDetails';
import MarkdownStep from '../Steps/MarkdownStep/MarkdownStep';
import SelectMethod from '../Steps/SelectMethod/SelectMethod';

export const DataSourceStep: SelectedModuleStepProps = {
	id: 'data-source',
	title: 'Data Source',
	component: <DataSource />,
};

export const EnvDetailsStep: SelectedModuleStepProps = {
	id: 'environment-details',
	title: 'Environment Details',
	component: <EnvironmentDetails />,
};

export const SelectMethodStep: SelectedModuleStepProps = {
	id: 'select-method',
	title: 'Select Method',
	component: <SelectMethod />,
};

export const SetupOtelCollectorStep: SelectedModuleStepProps = {
	id: 'setup-otel-collector',
	title: 'Setup Otel Collector',
	component: <MarkdownStep />,
};

export const InstallOpenTelemetryStep: SelectedModuleStepProps = {
	id: 'install-openTelemetry',
	title: 'Instrument Application',
	component: <MarkdownStep />,
};

export const CloneRepo: SelectedModuleStepProps = {
	id: 'clone-repo',
	title: 'Clone Repo',
	component: <MarkdownStep />,
};

export const StartContainer: SelectedModuleStepProps = {
	id: 'start-container',
	title: 'Start Container',
	component: <MarkdownStep />,
};

export const RunApplicationStep: SelectedModuleStepProps = {
	id: 'run-application',
	title: 'Run Application',
	component: <MarkdownStep />,
};

export const TestConnectionStep: SelectedModuleStepProps = {
	id: 'test-connection',
	title: 'Test Connection',
	component: <ConnectionStatus />,
};

export const ConfigureReceiver: SelectedModuleStepProps = {
	id: 'configure-receiver',
	title: 'Configure Receiver',
	component: <MarkdownStep />,
};

export const CheckServiceStatus: SelectedModuleStepProps = {
	id: 'check-service-status',
	title: 'Check Service Status',
	component: <MarkdownStep />,
};

export const RestartOtelCollector: SelectedModuleStepProps = {
	id: 'restart-otel-collector',
	title: 'Restart Otel Collector',
	component: <MarkdownStep />,
};

export const PlotMetrics: SelectedModuleStepProps = {
	id: 'plot-metrics',
	title: 'Plot Metrics',
	component: <MarkdownStep />,
};

export const ConfigureHostmetricsJSON: SelectedModuleStepProps = {
	id: 'configure-hostmetrics-json',
	title: 'Configure Hostmetrics JSON',
	component: <MarkdownStep />,
};

export const ConfigureMetricsReceiver: SelectedModuleStepProps = {
	id: 'configure-metrics-receiver',
	title: 'Configure Metrics Receiver',
	component: <MarkdownStep />,
};
