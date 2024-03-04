import { ILog } from 'types/api/logs/log';

import { LogType, SEVERITY_TEXT_TYPE } from './LogStateIndicator';

const getSeverityType = (severityText: string): string => {
	switch (severityText) {
		case SEVERITY_TEXT_TYPE.TRACE:
		case SEVERITY_TEXT_TYPE.TRACE2:
		case SEVERITY_TEXT_TYPE.TRACE3:
		case SEVERITY_TEXT_TYPE.TRACE4:
			return SEVERITY_TEXT_TYPE.TRACE;
		case SEVERITY_TEXT_TYPE.DEBUG:
		case SEVERITY_TEXT_TYPE.DEBUG2:
		case SEVERITY_TEXT_TYPE.DEBUG3:
		case SEVERITY_TEXT_TYPE.DEBUG4:
			return SEVERITY_TEXT_TYPE.DEBUG;
		case SEVERITY_TEXT_TYPE.INFO:
		case SEVERITY_TEXT_TYPE.INFO2:
		case SEVERITY_TEXT_TYPE.INFO3:
		case SEVERITY_TEXT_TYPE.INFO4:
			return SEVERITY_TEXT_TYPE.INFO;
		case SEVERITY_TEXT_TYPE.WARN:
		case SEVERITY_TEXT_TYPE.WARN2:
		case SEVERITY_TEXT_TYPE.WARN3:
		case SEVERITY_TEXT_TYPE.WARN4:
			return SEVERITY_TEXT_TYPE.WARN;
		case SEVERITY_TEXT_TYPE.ERROR:
		case SEVERITY_TEXT_TYPE.ERROR2:
		case SEVERITY_TEXT_TYPE.ERROR3:
		case SEVERITY_TEXT_TYPE.ERROR4:
			return SEVERITY_TEXT_TYPE.ERROR;
		case SEVERITY_TEXT_TYPE.FATAL:
		case SEVERITY_TEXT_TYPE.FATAL2:
		case SEVERITY_TEXT_TYPE.FATAL3:
		case SEVERITY_TEXT_TYPE.FATAL4:
			return SEVERITY_TEXT_TYPE.FATAL;
		default:
			return SEVERITY_TEXT_TYPE.INFO;
	}
};

export const getLogIndicatorType = (logData: ILog): string => {
	if (logData.severityText) {
		return getSeverityType(logData.severityText);
	}
	return logData.attributes_string?.log_level || LogType.INFO;
};

export const getLogIndicatorTypeForTable = (
	log: Record<string, unknown>,
): string => {
	if (log.severityText) {
		return getSeverityType(log.severityText as string);
	}
	return (log.log_level as string) || LogType.INFO;
};
