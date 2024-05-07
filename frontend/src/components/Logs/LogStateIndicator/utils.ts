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
		case SEVERITY_TEXT_TYPE.WARNING:
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
			return SEVERITY_TEXT_TYPE.UNKNOWN;
	}
};

const getLogSeverityTypeByNumber = (severityNumber: number): string => {
	// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
	if (severityNumber < 1) {
		return LogType.UNKNOWN;
	}
	if (severityNumber < 5) {
		return LogType.TRACE;
	}
	if (severityNumber < 9) {
		return LogType.DEBUG;
	}
	if (severityNumber < 13) {
		return LogType.INFO;
	}
	if (severityNumber < 17) {
		return LogType.WARNING;
	}
	if (severityNumber < 21) {
		return LogType.ERROR;
	}
	if (severityNumber < 25) {
		return LogType.FATAL;
	}
	return LogType.UNKNOWN;
};

export const getLogIndicatorType = (logData: ILog): string => {
	if (logData.severity_text) {
		const sevType = getSeverityType(logData.severity_text);
		if (sevType !== SEVERITY_TEXT_TYPE.UNKNOWN) {
			return sevType;
		}
	}

	if (logData.severity_number) {
		const sevType = getLogSeverityTypeByNumber(logData.severity_number);
		if (sevType !== LogType.UNKNOWN) {
			return sevType;
		}
	}

	return logData.attributes_string?.log_level || LogType.INFO;
};

export const getLogIndicatorTypeForTable = (
	log: Record<string, unknown>,
): string => {
	if (log.severity_text) {
		return getSeverityType(log.severity_text as string);
	}
	return (log.log_level as string) || LogType.INFO;
};
