import { ILog } from 'types/api/logs/log';

import { LogType, SEVERITY_TEXT_TYPE } from './LogStateIndicator';

const getSeverityType = (severityNumber: number): string => {
	if (severityNumber >= 1 && severityNumber <= 4) {
		return SEVERITY_TEXT_TYPE.TRACE;
	}
	if (severityNumber >= 5 && severityNumber <= 8) {
		return SEVERITY_TEXT_TYPE.DEBUG;
	}
	if (severityNumber >= 9 && severityNumber <= 12) {
		return SEVERITY_TEXT_TYPE.INFO;
	}
	if (severityNumber >= 13 && severityNumber <= 16) {
		return SEVERITY_TEXT_TYPE.WARN;
	}
	if (severityNumber >= 17 && severityNumber <= 20) {
		return SEVERITY_TEXT_TYPE.ERROR;
	}
	if (severityNumber >= 21 && severityNumber <= 24) {
		return SEVERITY_TEXT_TYPE.FATAL;
	}
	return SEVERITY_TEXT_TYPE.INFO;
};

export const getLogIndicatorType = (logData: ILog): string => {
	if (logData.severity_number) {
		return getSeverityType(logData.severity_number);
	}
	return logData.attributes_string?.log_level || LogType.INFO;
};

export const getLogIndicatorTypeForTable = (
	log: Record<string, unknown>,
): string => {
	if (log.severity_number) {
		return getSeverityType(log.severity_number as number);
	}
	return (log.log_level as string) || LogType.INFO;
};
