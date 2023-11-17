/* eslint-disable simple-import-sort/imports */

// Docker Logs Start
import LogsManagement_docker_cloneRepository from '../Modules/LogsManagement/Docker/md-docs/docker-cloneRepository.md';
import LogsManagement_docker_startContainer from '../Modules/LogsManagement/Docker/md-docs/docker-startContainers.md';
// Docker Logs End

// Kubernetes Pod Logs Start
import LogsManagement_kubernetes_setupOtelCollector from '../Modules/LogsManagement/Kubernetes/md-docs/kubernetes-installOtelCollector.md';
// Kubernetes Pod Logs End

// Application Logs Start

// LINUX AMD 64
import LogsManagement_application_logs_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxAMD64/appplicationLogs-linuxamd64-installOtelCollector.md';
import LogsManagement_application_logs_linuxAMD64_recommendedSteps_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxAMD64/appplicationLogs-linuxamd64-configureReceiver.md';
import LogsManagement_application_logs_linuxAMD64_recommendedSteps_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxAMD64/appplicationLogs-linuxamd64-runOtelCollector.md';

// LINUX ARM 64
import LogsManagement_application_logs_linuxARM64_recommendedSteps_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-installOtelCollector.md';
import LogsManagement_application_logs_linuxARM64_recommendedSteps_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-configureReceiver.md';
import LogsManagement_application_logs_linuxARM64_recommendedSteps_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-runOtelCollector.md';

// MacOS AMD 64
import LogsManagement_application_logs_macOsAMD64_recommendedSteps_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-installOtelCollector.md';
import LogsManagement_application_logs_macOsAMD64_recommendedSteps_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-configureReceiver.md';
import LogsManagement_application_logs_macOsAMD64_recommendedSteps_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-runOtelCollector.md';

// MacOS ARM 64
import LogsManagement_application_logs_macOsARM64_recommendedSteps_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-installOtelCollector.md';
import LogsManagement_application_logs_macOsARM64_recommendedSteps_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-configureReceiver.md';
import LogsManagement_application_logs_macOsARM64_recommendedSteps_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-runOtelCollector.md';
// Application Logs End

// Syslogs

// //Syslogs-LinuxAMD64
import LogsManagement_syslogs_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/SysLogs/md-docs/LinuxAMD64/syslogs-linuxamd64-installOtelCollector.md';
import LogsManagement_syslogs_linuxAMD64_configureReceiver from '../Modules/LogsManagement/SysLogs/md-docs/LinuxAMD64/syslogs-linuxamd64-configureReceiver.md';
import LogsManagement_syslogs_linuxAMD64_checkServiceStatus from '../Modules/LogsManagement/SysLogs/md-docs/LinuxAMD64/syslogs-linuxamd64-checkServiceStatus.md';

// //Syslogs-LinuxARM64
import LogsManagement_syslogs_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/SysLogs/md-docs/LinuxARM64/syslogs-linuxarm64-installOtelCollector.md';
import LogsManagement_syslogs_linuxARM64_configureReceiver from '../Modules/LogsManagement/SysLogs/md-docs/LinuxARM64/syslogs-linuxarm64-configureReceiver.md';
import LogsManagement_syslogs_linuxARM64_checkServiceStatus from '../Modules/LogsManagement/SysLogs/md-docs/LinuxARM64/syslogs-linuxarm64-checkServiceStatus.md';

// //Syslogs-MacOsAMD64
import LogsManagement_syslogs_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/SysLogs/md-docs/MacOsAMD64/syslogs-macosamd64-installOtelCollector.md';
import LogsManagement_syslogs_macOsAMD64_configureReceiver from '../Modules/LogsManagement/SysLogs/md-docs/MacOsAMD64/syslogs-macosamd64-configureReceiver.md';
import LogsManagement_syslogs_macOsAMD64_checkServiceStatus from '../Modules/LogsManagement/SysLogs/md-docs/MacOsAMD64/syslogs-macosamd64-checkServiceStatus.md';

// //Syslogs-MacOsARM64
import LogsManagement_syslogs_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosamd64-installOtelCollector.md';
import LogsManagement_syslogs_macOsARM64_configureReceiver from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosamd64-configureReceiver.md';
import LogsManagement_syslogs_macOsARM64_checkServiceStatus from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosamd64-checkServiceStatus.md';

export const LogsManagementDocFilePaths = {
	// Kubernetes Pod Logs
	LogsManagement_kubernetes_setupOtelCollector,

	// Docker Logs
	LogsManagement_docker_cloneRepository,
	LogsManagement_docker_startContainer,

	// Syslogs

	// //Syslogs-LinuxAMD64
	LogsManagement_syslogs_linuxAMD64_setupOtelCollector,
	LogsManagement_syslogs_linuxAMD64_configureReceiver,
	LogsManagement_syslogs_linuxAMD64_checkServiceStatus,

	// //Syslogs-LinuxARM64
	LogsManagement_syslogs_linuxARM64_setupOtelCollector,
	LogsManagement_syslogs_linuxARM64_configureReceiver,
	LogsManagement_syslogs_linuxARM64_checkServiceStatus,

	// //Syslogs-MacOsAMD64
	LogsManagement_syslogs_macOsAMD64_setupOtelCollector,
	LogsManagement_syslogs_macOsAMD64_configureReceiver,
	LogsManagement_syslogs_macOsAMD64_checkServiceStatus,

	// //Syslogs-MacOsARM64
	LogsManagement_syslogs_macOsARM64_setupOtelCollector,
	LogsManagement_syslogs_macOsARM64_configureReceiver,
	LogsManagement_syslogs_macOsARM64_checkServiceStatus,

	// Application-Logs
	LogsManagement_application_logs_linuxAMD64_setupOtelCollector,
	LogsManagement_application_logs_linuxAMD64_recommendedSteps_configureReceiver,
	LogsManagement_application_logs_linuxAMD64_recommendedSteps_restartOtelCollector,

	// //Application-Logs-LinuxARM64
	LogsManagement_application_logs_linuxARM64_recommendedSteps_setupOtelCollector,
	LogsManagement_application_logs_linuxARM64_recommendedSteps_configureReceiver,
	LogsManagement_application_logs_linuxARM64_recommendedSteps_restartOtelCollector,

	// //Application-Logs-MacOsAMD64
	LogsManagement_application_logs_macOsAMD64_recommendedSteps_setupOtelCollector,
	LogsManagement_application_logs_macOsAMD64_recommendedSteps_configureReceiver,
	LogsManagement_application_logs_macOsAMD64_recommendedSteps_restartOtelCollector,

	// //Application-Logs-MacOsARM64
	LogsManagement_application_logs_macOsARM64_recommendedSteps_setupOtelCollector,
	LogsManagement_application_logs_macOsARM64_recommendedSteps_configureReceiver,
	LogsManagement_application_logs_macOsARM64_recommendedSteps_restartOtelCollector,

	// ------------------------------------------------------------------------------------------------
};
