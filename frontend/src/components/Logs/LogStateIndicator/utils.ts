import { ILog } from 'types/api/logs/log';

import { LogType, SEVERITY_TEXT_TYPE } from './LogStateIndicator';

const getLogTypeBySeverityText = (severityText: string): string => {
	switch (severityText) {
		case SEVERITY_TEXT_TYPE.TRACE:
		case SEVERITY_TEXT_TYPE.TRACE2:
		case SEVERITY_TEXT_TYPE.TRACE3:
		case SEVERITY_TEXT_TYPE.TRACE4:
			return LogType.TRACE;
		case SEVERITY_TEXT_TYPE.DEBUG:
		case SEVERITY_TEXT_TYPE.DEBUG2:
		case SEVERITY_TEXT_TYPE.DEBUG3:
		case SEVERITY_TEXT_TYPE.DEBUG4:
			return LogType.DEBUG;
		case SEVERITY_TEXT_TYPE.INFO:
		case SEVERITY_TEXT_TYPE.INFO2:
		case SEVERITY_TEXT_TYPE.INFO3:
		case SEVERITY_TEXT_TYPE.INFO4:
			return LogType.INFO;
		case SEVERITY_TEXT_TYPE.WARN:
		case SEVERITY_TEXT_TYPE.WARN2:
		case SEVERITY_TEXT_TYPE.WARN3:
		case SEVERITY_TEXT_TYPE.WARN4:
		case SEVERITY_TEXT_TYPE.WARNING:
			return LogType.WARN;
		case SEVERITY_TEXT_TYPE.ERROR:
		case SEVERITY_TEXT_TYPE.ERROR2:
		case SEVERITY_TEXT_TYPE.ERROR3:
		case SEVERITY_TEXT_TYPE.ERROR4:
			return LogType.ERROR;
		case SEVERITY_TEXT_TYPE.FATAL:
		case SEVERITY_TEXT_TYPE.FATAL2:
		case SEVERITY_TEXT_TYPE.FATAL3:
		case SEVERITY_TEXT_TYPE.FATAL4:
			return LogType.FATAL;
		default:
			return LogType.UNKNOWN;
	}
};

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
const getLogTypeBySeverityNumber = (severityNumber: number): string => {
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
		return LogType.WARN;
	}
	if (severityNumber < 21) {
		return LogType.ERROR;
	}
	if (severityNumber < 25) {
		return LogType.FATAL;
	}
	return LogType.UNKNOWN;
};

const getLogType = (
	severityText: string,
	severityNumber: number,
	defaultType: string,
): string => {
	// give priority to the severityNumber
	if (severityNumber) {
		const logType = getLogTypeBySeverityNumber(severityNumber);
		if (logType !== LogType.UNKNOWN) {
			return logType;
		}
	}

	// is severityNumber is not present then rely on the severityText
	if (severityText) {
		const logType = getLogTypeBySeverityText(severityText);
		if (logType !== LogType.UNKNOWN) {
			return logType;
		}
	}

	return defaultType;
};

export const getLogIndicatorType = (logData: ILog): string => {
	const defaultType = logData.attributes_string?.log_level || LogType.INFO;
	// convert the severity_text to upper case for the comparison to support case insensitive values
	return getLogType(
		logData?.severity_text?.toUpperCase(),
		logData?.severity_number || 0,
		defaultType,
	);
};

export const getLogIndicatorTypeForTable = (
	log: Record<string, unknown>,
): string => {
	const defaultType = (log.log_level as string) || LogType.INFO;
	// convert the severity_text to upper case for the comparison to support case insensitive values
	return getLogType(
		(log?.severity_text as string)?.toUpperCase(),
		(log?.severity_number as number) || 0,
		defaultType,
	);
};
