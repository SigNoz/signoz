/* eslint-disable simple-import-sort/imports */

// Kubernetes Infra Metrics Start
import InfrastructureMonitoring_kubernetesInfraMetrics_setupOtelCollector from '../Modules/InfrastructureMonitoring/KubernetesInfraMetrics/md-docs/kubernetes-setupOtelCollector.md';
import InfrastructureMonitoring_kubernetesInfraMetrics_plotMetrics from '../Modules/InfrastructureMonitoring/KubernetesInfraMetrics/md-docs/kubernetes-plotMetrics.md';
// Kubernetes Infra Metrics End

// Hostmetrics Start
// LINUX AMD 64
import InfrastructureMonitoring_hostMetrics_linuxAMD64_setupOtelCollector from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/LinuxAMD64/hostmetrics-setupOtelCollector.md';
import InfrastructureMonitoring_hostMetrics_linuxAMD64_configureHostmetricsJson from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/LinuxAMD64/hostmetrics-configureHostmetricsJson.md';

// LINUX ARM 64
import InfrastructureMonitoring_hostMetrics_linuxARM64_setupOtelCollector from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/LinuxARM64/hostmetrics-setupOtelCollector.md';
import InfrastructureMonitoring_hostMetrics_linuxARM64_configureHostmetricsJson from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/LinuxARM64/hostmetrics-configureHostmetricsJson.md';

// MacOS AMD 64
import InfrastructureMonitoring_hostMetrics_macOsAMD64_setupOtelCollector from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/MacOsAMD64/hostmetrics-setupOtelCollector.md';
import InfrastructureMonitoring_hostMetrics_macOsAMD64_configureHostmetricsJson from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/MacOsAMD64/hostmetrics-configureHostmetricsJson.md';

// MacOS ARM 64
import InfrastructureMonitoring_hostMetrics_macOsARM64_setupOtelCollector from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/MacOsARM64/hostmetrics-setupOtelCollector.md';
import InfrastructureMonitoring_hostMetrics_macOsARM64_configureHostmetricsJson from '../Modules/InfrastructureMonitoring/Hostmetrics/md-docs/MacOsARM64/hostmetrics-configureHostmetricsJson.md';

// Hostmetrics End

// Other Metrics Start
// LINUX AMD 64
import InfrastructureMonitoring_otherMetrics_linuxAMD64_setupOtelCollector from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/LinuxAMD64/otherMetrics-setupOtelCollector.md';
import InfrastructureMonitoring_otherMetrics_linuxAMD64_configureMetricsReceiver from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/LinuxAMD64/otherMetrics-configureReceiver.md';

// LINUX ARM 64
import InfrastructureMonitoring_otherMetrics_linuxARM64_setupOtelCollector from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/LinuxARM64/otherMetrics-setupOtelCollector.md';
import InfrastructureMonitoring_otherMetrics_linuxARM64_configureMetricsReceiver from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/LinuxARM64/otherMetrics-configureReceiver.md';

// MacOS AMD 64
import InfrastructureMonitoring_otherMetrics_macOsAMD64_setupOtelCollector from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/MacOsAMD64/otherMetrics-setupOtelCollector.md';
import InfrastructureMonitoring_otherMetrics_macOsAMD64_configureMetricsReceiver from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/MacOsAMD64/otherMetrics-configureReceiver.md';

// MacOS ARM 64
import InfrastructureMonitoring_otherMetrics_macOsARM64_setupOtelCollector from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/MacOsARM64/otherMetrics-setupOtelCollector.md';
import InfrastructureMonitoring_otherMetrics_macOsARM64_configureMetricsReceiver from '../Modules/InfrastructureMonitoring/OtherMetrics/md-docs/MacOsARM64/otherMetrics-configureReceiver.md';

// Other Metrics End

export const InfraMonitoringDocFilePaths = {
	// Kubernetes Infra Metrics Start
	InfrastructureMonitoring_kubernetesInfraMetrics_setupOtelCollector,
	InfrastructureMonitoring_kubernetesInfraMetrics_plotMetrics,
	// Kubernetes Infra Metrics End

	// Hostmetrics Start
	// LINUX AMD 64

	InfrastructureMonitoring_hostMetrics_linuxAMD64_setupOtelCollector,
	InfrastructureMonitoring_hostMetrics_linuxAMD64_configureHostmetricsJson,

	// LINUX ARM 64
	InfrastructureMonitoring_hostMetrics_linuxARM64_setupOtelCollector,
	InfrastructureMonitoring_hostMetrics_linuxARM64_configureHostmetricsJson,

	// MacOS AMD 64
	InfrastructureMonitoring_hostMetrics_macOsAMD64_setupOtelCollector,
	InfrastructureMonitoring_hostMetrics_macOsAMD64_configureHostmetricsJson,

	// MacOS ARM 64
	InfrastructureMonitoring_hostMetrics_macOsARM64_setupOtelCollector,
	InfrastructureMonitoring_hostMetrics_macOsARM64_configureHostmetricsJson,
	// Hostmetrics End

	// Other Metrics Start
	// LINUX AMD 64

	InfrastructureMonitoring_otherMetrics_linuxAMD64_setupOtelCollector,
	InfrastructureMonitoring_otherMetrics_linuxAMD64_configureMetricsReceiver,

	// LINUX ARM 64
	InfrastructureMonitoring_otherMetrics_linuxARM64_setupOtelCollector,
	InfrastructureMonitoring_otherMetrics_linuxARM64_configureMetricsReceiver,

	// MacOS AMD 64
	InfrastructureMonitoring_otherMetrics_macOsAMD64_setupOtelCollector,
	InfrastructureMonitoring_otherMetrics_macOsAMD64_configureMetricsReceiver,

	// MacOS ARM 64
	InfrastructureMonitoring_otherMetrics_macOsARM64_setupOtelCollector,
	InfrastructureMonitoring_otherMetrics_macOsARM64_configureMetricsReceiver,

	// Other Metrics End
};
