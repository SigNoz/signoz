import { ILog } from 'types/api/logs/log';

import { LogType, SEVERITY_TEXT_TYPE } from './LogStateIndicator';

export const getLogIndicatorType = (logData: ILog): string => {
	if (logData.severityText) {
		switch (logData.severityText) {
			case SEVERITY_TEXT_TYPE.TRACE:
				return SEVERITY_TEXT_TYPE.TRACE;
			case SEVERITY_TEXT_TYPE.DEBUG:
				return SEVERITY_TEXT_TYPE.DEBUG;
			case SEVERITY_TEXT_TYPE.INFO:
				return SEVERITY_TEXT_TYPE.INFO;
			case SEVERITY_TEXT_TYPE.WARN:
				return SEVERITY_TEXT_TYPE.WARN;
			case SEVERITY_TEXT_TYPE.ERROR:
				return SEVERITY_TEXT_TYPE.ERROR;
			case SEVERITY_TEXT_TYPE.FATAL:
				return SEVERITY_TEXT_TYPE.FATAL;
			default:
				return SEVERITY_TEXT_TYPE.INFO;
		}
	} else {
		return logData.attributes_string.log_level || LogType.INFO;
	}
};

export const getLogIndicatorTypeForTable = (
	log: Record<string, unknown>,
): string => {
	if (log.severityText) {
		switch (log.severityText) {
			case SEVERITY_TEXT_TYPE.TRACE:
				return SEVERITY_TEXT_TYPE.TRACE;
			case SEVERITY_TEXT_TYPE.DEBUG:
				return SEVERITY_TEXT_TYPE.DEBUG;
			case SEVERITY_TEXT_TYPE.INFO:
				return SEVERITY_TEXT_TYPE.INFO;
			case SEVERITY_TEXT_TYPE.WARN:
				return SEVERITY_TEXT_TYPE.WARN;
			case SEVERITY_TEXT_TYPE.ERROR:
				return SEVERITY_TEXT_TYPE.ERROR;
			case SEVERITY_TEXT_TYPE.FATAL:
				return SEVERITY_TEXT_TYPE.FATAL;
			default:
				return SEVERITY_TEXT_TYPE.INFO;
		}
	} else {
		return (log.log_level as string) || LogType.INFO;
	}
};
