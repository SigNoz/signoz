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

import LogsManagement_application_logs_linuxAMD64_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxAMD64/appplicationLogs-linuxamd64-configureReceiver.md';
import LogsManagement_application_logs_linuxAMD64_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxAMD64/appplicationLogs-linuxamd64-runOtelCollector.md';

// LINUX ARM 64
import LogsManagement_application_logs_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-installOtelCollector.md';
import LogsManagement_application_logs_linuxARM64_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-configureReceiver.md';
import LogsManagement_application_logs_linuxARM64_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/LinuxARM64/appplicationLogs-linuxarm64-runOtelCollector.md';

// MacOS AMD 64
import LogsManagement_application_logs_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-installOtelCollector.md';
import LogsManagement_application_logs_macOsAMD64_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-configureReceiver.md';
import LogsManagement_application_logs_macOsAMD64_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsAMD64/appplicationLogs-macosamd64-runOtelCollector.md';

// MacOS ARM 64
import LogsManagement_application_logs_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-installOtelCollector.md';
import LogsManagement_application_logs_macOsARM64_configureReceiver from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-configureReceiver.md';
import LogsManagement_application_logs_macOsARM64_restartOtelCollector from '../Modules/LogsManagement/ApplicationLogs/md-docs/MacOsARM64/appplicationLogs-macosarm64-runOtelCollector.md';
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
import LogsManagement_syslogs_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosarm64-installOtelCollector.md';
import LogsManagement_syslogs_macOsARM64_configureReceiver from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosarm64-configureReceiver.md';
import LogsManagement_syslogs_macOsARM64_checkServiceStatus from '../Modules/LogsManagement/SysLogs/md-docs/MacOsARM64/syslogs-macosarm64-checkServiceStatus.md';

// FluentD

// //fluentbit-LinuxAMD64
import LogsManagement_fluentBit_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/LinuxAMD64/fluentbit-linuxamd64-installOtelCollector.md';
import LogsManagement_fluentBit_linuxAMD64_configureReceiver from '../Modules/LogsManagement/FluentBit/md-docs/LinuxAMD64/fluentbit-linuxamd64-configureReceiver.md';
import LogsManagement_fluentBit_linuxAMD64_restartOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/LinuxAMD64/fluentbit-linuxamd64-restartOtelCollector.md';

// //fluentbit-LinuxARM64
import LogsManagement_fluentBit_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/LinuxARM64/fluentbit-linuxarm64-installOtelCollector.md';
import LogsManagement_fluentBit_linuxARM64_configureReceiver from '../Modules/LogsManagement/FluentBit/md-docs/LinuxARM64/fluentbit-linuxarm64-configureReceiver.md';
import LogsManagement_fluentBit_linuxARM64_restartOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/LinuxARM64/fluentbit-linuxarm64-restartOtelCollector.md';

// //fluentbit-MacOsAMD64
import LogsManagement_fluentBit_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/MacOsAMD64/fluentbit-macosamd64-installOtelCollector.md';
import LogsManagement_fluentBit_macOsAMD64_configureReceiver from '../Modules/LogsManagement/FluentBit/md-docs/MacOsAMD64/fluentbit-macosamd64-configureReceiver.md';
import LogsManagement_fluentBit_macOsAMD64_restartOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/MacOsAMD64/fluentbit-macosamd64-restartOtelCollector.md';

// //fluentbit-MacOsARM64
import LogsManagement_fluentBit_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/MacOsARM64/fluentbit-macosarm64-installOtelCollector.md';
import LogsManagement_fluentBit_macOsARM64_configureReceiver from '../Modules/LogsManagement/FluentBit/md-docs/MacOsARM64/fluentbit-macosarm64-configureReceiver.md';
import LogsManagement_fluentBit_macOsARM64_restartOtelCollector from '../Modules/LogsManagement/FluentBit/md-docs/MacOsARM64/fluentBit-macosarm64-restartOtelCollector.md';

// FluentD

// //fluentD-LinuxAMD64
import LogsManagement_fluentD_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/LinuxAMD64/fluentd-linuxamd64-installOtelCollector.md';
import LogsManagement_fluentD_linuxAMD64_configureReceiver from '../Modules/LogsManagement/FluentD/md-docs/LinuxAMD64/fluentd-linuxamd64-configureReceiver.md';
import LogsManagement_fluentD_linuxAMD64_restartOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/LinuxAMD64/fluentd-linuxamd64-restartOtelCollector.md';

// //fluentd-LinuxARM64
import LogsManagement_fluentD_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/LinuxARM64/fluentd-linuxarm64-installOtelCollector.md';
import LogsManagement_fluentD_linuxARM64_configureReceiver from '../Modules/LogsManagement/FluentD/md-docs/LinuxARM64/fluentd-linuxarm64-configureReceiver.md';
import LogsManagement_fluentD_linuxARM64_restartOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/LinuxARM64/fluentd-linuxarm64-restartOtelCollector.md';

// //fluentd-MacOsAMD64
import LogsManagement_fluentD_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/MacOsAMD64/fluentd-macosamd64-installOtelCollector.md';
import LogsManagement_fluentD_macOsAMD64_configureReceiver from '../Modules/LogsManagement/FluentD/md-docs/MacOsAMD64/fluentd-macosamd64-configureReceiver.md';
import LogsManagement_fluentD_macOsAMD64_restartOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/MacOsAMD64/fluentd-macosamd64-restartOtelCollector.md';

// //fluentd-MacOsARM64
import LogsManagement_fluentD_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/MacOsARM64/fluentd-macosarm64-installOtelCollector.md';
import LogsManagement_fluentD_macOsARM64_configureReceiver from '../Modules/LogsManagement/FluentD/md-docs/MacOsARM64/fluentd-macosarm64-configureReceiver.md';
import LogsManagement_fluentD_macOsARM64_restartOtelCollector from '../Modules/LogsManagement/FluentD/md-docs/MacOsARM64/fluentd-macosarm64-restartOtelCollector.md';

// Logstash

// //fluentD-LinuxAMD64
import LogsManagement_logStash_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/LinuxAMD64/logstash-linuxamd64-installOtelCollector.md';
import LogsManagement_logStash_linuxAMD64_configureReceiver from '../Modules/LogsManagement/Logstash/md-docs/LinuxAMD64/logstash-linuxamd64-configureReceiver.md';
import LogsManagement_logStash_linuxAMD64_restartOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/LinuxAMD64/logstash-linuxamd64-restartOtelCollector.md';

// //logstash-LinuxARM64
import LogsManagement_logStash_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/LinuxARM64/logstash-linuxarm64-installOtelCollector.md';
import LogsManagement_logStash_linuxARM64_configureReceiver from '../Modules/LogsManagement/Logstash/md-docs/LinuxARM64/logstash-linuxarm64-configureReceiver.md';
import LogsManagement_logStash_linuxARM64_restartOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/LinuxARM64/logstash-linuxarm64-restartOtelCollector.md';

// //logstash-MacOsAMD64
import LogsManagement_logStash_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/MacOsAMD64/logstash-macosamd64-installOtelCollector.md';
import LogsManagement_logStash_macOsAMD64_configureReceiver from '../Modules/LogsManagement/Logstash/md-docs/MacOsAMD64/logstash-macosamd64-configureReceiver.md';
import LogsManagement_logStash_macOsAMD64_restartOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/MacOsAMD64/logstash-macosamd64-restartOtelCollector.md';

// //logstash-MacOsARM64
import LogsManagement_logStash_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/MacOsARM64/logstash-macosarm64-installOtelCollector.md';
import LogsManagement_logStash_macOsARM64_configureReceiver from '../Modules/LogsManagement/Logstash/md-docs/MacOsARM64/logstash-macosarm64-configureReceiver.md';
import LogsManagement_logStash_macOsARM64_restartOtelCollector from '../Modules/LogsManagement/Logstash/md-docs/MacOsARM64/logstash-macosarm64-restartOtelCollector.md';

// Heroku

import LogsManagement_heroku_addHttpDrain from '../Modules/LogsManagement/Heroku/md-docs/heroku-addHttpDrain.md';

// Vercel

import LogsManagement_vercel_setupLogDrains from '../Modules/LogsManagement/Vercel/md-docs/vercel-setupLogDrains.md';

// HTTP

import LogsManagement_http_createHttpPayload from '../Modules/LogsManagement/Http/md-docs/httpJsonPayload.md';

// Cloudwatch

import LogsManagement_cloudwatch_linuxAMD64_setupOtelCollector from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxAMD64/cloudwatch-linuxamd64-installOtelCollector.md';
import LogsManagement_cloudwatch_linuxAMD64_configureAws from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxAMD64/cloudwatch-linuxamd64-configureAws.md';
import LogsManagement_cloudwatch_linuxAMD64_configureReceiver from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxAMD64/cloudwatch-linuxamd64-configureReceiver.md';
import LogsManagement_cloudwatch_linuxAMD64_sendLogsCloudwatch from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxAMD64/cloudwatch-linuxamd64-sendLogs.md';

import LogsManagement_cloudwatch_linuxARM64_setupOtelCollector from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxARM64/cloudwatch-linuxarm64-installOtelCollector.md';
import LogsManagement_cloudwatch_linuxARM64_configureAws from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxARM64/cloudwatch-linuxarm64-configureAws.md';
import LogsManagement_cloudwatch_linuxARM64_configureReceiver from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxARM64/cloudwatch-linuxarm64-configureReceiver.md';
import LogsManagement_cloudwatch_linuxARM64_sendLogsCloudwatch from '../Modules/LogsManagement/Cloudwatch/md-docs/LinuxARM64/cloudwatch-linuxarm64-sendLogs.md';

import LogsManagement_cloudwatch_macOsAMD64_setupOtelCollector from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsAMD64/cloudwatch-macosamd64-installOtelCollector.md';
import LogsManagement_cloudwatch_macOsAMD64_configureAws from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsAMD64/cloudwatch-macosamd64-configureAws.md';
import LogsManagement_cloudwatch_macOsAMD64_configureReceiver from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsAMD64/cloudwatch-macosamd64-configureReceiver.md';
import LogsManagement_cloudwatch_macOsAMD64_sendLogsCloudwatch from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsAMD64/cloudwatch-macosamd64-sendLogs.md';

import LogsManagement_cloudwatch_macOsARM64_setupOtelCollector from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsARM64/cloudwatch-macosarm64-installOtelCollector.md';
import LogsManagement_cloudwatch_macOsARM64_configureAws from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsARM64/cloudwatch-macosarm64-configureAws.md';
import LogsManagement_cloudwatch_macOsARM64_configureReceiver from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsARM64/cloudwatch-macosarm64-configureReceiver.md';
import LogsManagement_cloudwatch_macOsARM64_sendLogsCloudwatch from '../Modules/LogsManagement/Cloudwatch/md-docs/MacOsARM64/cloudwatch-macosarm64-sendLogs.md';

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
	LogsManagement_application_logs_linuxAMD64_configureReceiver,
	LogsManagement_application_logs_linuxAMD64_restartOtelCollector,

	// //Application-Logs-LinuxARM64
	LogsManagement_application_logs_linuxARM64_setupOtelCollector,
	LogsManagement_application_logs_linuxARM64_configureReceiver,
	LogsManagement_application_logs_linuxARM64_restartOtelCollector,

	// //Application-Logs-MacOsAMD64
	LogsManagement_application_logs_macOsAMD64_setupOtelCollector,
	LogsManagement_application_logs_macOsAMD64_configureReceiver,
	LogsManagement_application_logs_macOsAMD64_restartOtelCollector,

	// //Application-Logs-MacOsARM64
	LogsManagement_application_logs_macOsARM64_setupOtelCollector,
	LogsManagement_application_logs_macOsARM64_configureReceiver,
	LogsManagement_application_logs_macOsARM64_restartOtelCollector,

	// FluentBit

	// //FluentBit-LinuxAMD64
	LogsManagement_fluentBit_linuxAMD64_setupOtelCollector,
	LogsManagement_fluentBit_linuxAMD64_configureReceiver,
	LogsManagement_fluentBit_linuxAMD64_restartOtelCollector,

	// //FluentBit-LinuxARM64
	LogsManagement_fluentBit_linuxARM64_setupOtelCollector,
	LogsManagement_fluentBit_linuxARM64_configureReceiver,
	LogsManagement_fluentBit_linuxARM64_restartOtelCollector,

	// //FluentBit-MacOsAMD64
	LogsManagement_fluentBit_macOsAMD64_setupOtelCollector,
	LogsManagement_fluentBit_macOsAMD64_configureReceiver,
	LogsManagement_fluentBit_macOsAMD64_restartOtelCollector,

	// //FluentBit-MacOsARM64
	LogsManagement_fluentBit_macOsARM64_setupOtelCollector,
	LogsManagement_fluentBit_macOsARM64_configureReceiver,
	LogsManagement_fluentBit_macOsARM64_restartOtelCollector,

	// FluentD

	// //FluentD-LinuxAMD64
	LogsManagement_fluentD_linuxAMD64_setupOtelCollector,
	LogsManagement_fluentD_linuxAMD64_configureReceiver,
	LogsManagement_fluentD_linuxAMD64_restartOtelCollector,

	// //FluentD-LinuxARM64
	LogsManagement_fluentD_linuxARM64_setupOtelCollector,
	LogsManagement_fluentD_linuxARM64_configureReceiver,
	LogsManagement_fluentD_linuxARM64_restartOtelCollector,

	// //FluentD-MacOsAMD64
	LogsManagement_fluentD_macOsAMD64_setupOtelCollector,
	LogsManagement_fluentD_macOsAMD64_configureReceiver,
	LogsManagement_fluentD_macOsAMD64_restartOtelCollector,

	// //FluentD-MacOsARM64
	LogsManagement_fluentD_macOsARM64_setupOtelCollector,
	LogsManagement_fluentD_macOsARM64_configureReceiver,
	LogsManagement_fluentD_macOsARM64_restartOtelCollector,

	// LogStash
	// //LogStash-LinuxAMD64
	LogsManagement_logStash_linuxAMD64_setupOtelCollector,
	LogsManagement_logStash_linuxAMD64_configureReceiver,
	LogsManagement_logStash_linuxAMD64_restartOtelCollector,

	// //LogStash-LinuxARM64
	LogsManagement_logStash_linuxARM64_setupOtelCollector,
	LogsManagement_logStash_linuxARM64_configureReceiver,
	LogsManagement_logStash_linuxARM64_restartOtelCollector,

	// //LogStash-MacOsAMD64
	LogsManagement_logStash_macOsAMD64_setupOtelCollector,
	LogsManagement_logStash_macOsAMD64_configureReceiver,
	LogsManagement_logStash_macOsAMD64_restartOtelCollector,

	// //LogStash-MacOsARM64
	LogsManagement_logStash_macOsARM64_setupOtelCollector,
	LogsManagement_logStash_macOsARM64_configureReceiver,
	LogsManagement_logStash_macOsARM64_restartOtelCollector,

	// Heroku
	LogsManagement_heroku_addHttpDrain,
	// ------------------------------------------------------------------------------------------------

	// Vercel
	LogsManagement_vercel_setupLogDrains,

	// HTTP
	LogsManagement_http_createHttpPayload,

	// Cloudwatch

	LogsManagement_cloudwatch_linuxAMD64_setupOtelCollector,
	LogsManagement_cloudwatch_linuxAMD64_configureAws,
	LogsManagement_cloudwatch_linuxAMD64_configureReceiver,
	LogsManagement_cloudwatch_linuxAMD64_sendLogsCloudwatch,

	LogsManagement_cloudwatch_linuxARM64_setupOtelCollector,
	LogsManagement_cloudwatch_linuxARM64_configureAws,
	LogsManagement_cloudwatch_linuxARM64_configureReceiver,
	LogsManagement_cloudwatch_linuxARM64_sendLogsCloudwatch,

	LogsManagement_cloudwatch_macOsAMD64_setupOtelCollector,
	LogsManagement_cloudwatch_macOsAMD64_configureAws,
	LogsManagement_cloudwatch_macOsAMD64_configureReceiver,
	LogsManagement_cloudwatch_macOsAMD64_sendLogsCloudwatch,

	LogsManagement_cloudwatch_macOsARM64_setupOtelCollector,
	LogsManagement_cloudwatch_macOsARM64_configureAws,
	LogsManagement_cloudwatch_macOsARM64_configureReceiver,
	LogsManagement_cloudwatch_macOsARM64_sendLogsCloudwatch,
};
