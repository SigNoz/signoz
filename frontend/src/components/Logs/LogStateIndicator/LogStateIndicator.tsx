import './LogStateIndicator.styles.scss';

import cx from 'classnames';
import { FontSize } from 'container/OptionsMenu/types';

import { getLogTypeBySeverityNumber } from './utils';

export const SEVERITY_TEXT_TYPE = {
	TRACE: 'TRACE',
	TRACE2: 'TRACE2',
	TRACE3: 'TRACE3',
	TRACE4: 'TRACE4',
	DEBUG: 'DEBUG',
	DEBUG2: 'DEBUG2',
	DEBUG3: 'DEBUG3',
	DEBUG4: 'DEBUG4',
	INFO: 'INFO',
	INFO2: 'INFO2',
	INFO3: 'INFO3',
	INFO4: 'INFO4',
	WARN: 'WARN',
	WARN2: 'WARN2',
	WARN3: 'WARN3',
	WARN4: 'WARN4',
	WARNING: 'WARNING',
	ERROR: 'ERROR',
	ERROR2: 'ERROR2',
	ERROR3: 'ERROR3',
	ERROR4: 'ERROR4',
	FATAL: 'FATAL',
	FATAL2: 'FATAL2',
	FATAL3: 'FATAL3',
	FATAL4: 'FATAL4',
	UNKNOWN: 'UNKNOWN',
} as const;

export const LogType = {
	TRACE: 'TRACE',
	DEBUG: 'DEBUG',
	INFO: 'INFO',
	WARN: 'WARN',
	ERROR: 'ERROR',
	FATAL: 'FATAL',
	UNKNOWN: 'UNKNOWN',
} as const;

// Severity variant mapping to CSS classes
const SEVERITY_VARIANT_CLASSES: Record<string, string> = {
	// Trace variants - forest-600 to forest-200
	TRACE: 'severity-trace-0',
	Trace: 'severity-trace-1',
	trace: 'severity-trace-2',
	trc: 'severity-trace-3',
	Trc: 'severity-trace-4',

	// Debug variants - aqua-600 to aqua-200
	DEBUG: 'severity-debug-0',
	Debug: 'severity-debug-1',
	debug: 'severity-debug-2',
	dbg: 'severity-debug-3',
	Dbg: 'severity-debug-4',

	// Info variants - robin-600 to robin-200
	INFO: 'severity-info-0',
	Info: 'severity-info-1',
	info: 'severity-info-2',
	Information: 'severity-info-3',
	information: 'severity-info-4',

	// Warn variants - amber-600 to amber-200
	WARN: 'severity-warn-0',
	WARNING: 'severity-warn-0',
	Warn: 'severity-warn-1',
	warn: 'severity-warn-2',
	warning: 'severity-warn-3',
	Warning: 'severity-warn-4',
	wrn: 'severity-warn-3',
	Wrn: 'severity-warn-4',

	// Error variants - cherry-600 to cherry-200
	// eslint-disable-next-line sonarjs/no-duplicate-string
	ERROR: 'severity-error-0',
	Error: 'severity-error-1',
	error: 'severity-error-2',
	err: 'severity-error-3',
	Err: 'severity-error-4',
	ERR: 'severity-error-0',
	fail: 'severity-error-2',
	Fail: 'severity-error-3',
	FAIL: 'severity-error-0',

	// Fatal variants - sakura-600 to sakura-200
	// eslint-disable-next-line sonarjs/no-duplicate-string
	FATAL: 'severity-fatal-0',
	Fatal: 'severity-fatal-1',
	fatal: 'severity-fatal-2',
	// eslint-disable-next-line sonarjs/no-duplicate-string
	critical: 'severity-fatal-3',
	Critical: 'severity-fatal-4',
	CRITICAL: 'severity-fatal-0',
	crit: 'severity-fatal-3',
	Crit: 'severity-fatal-4',
	CRIT: 'severity-fatal-0',
	panic: 'severity-fatal-2',
	Panic: 'severity-fatal-3',
	PANIC: 'severity-fatal-0',
};

function getSeverityClass(
	severityText?: string,
	severityNumber?: number,
): string {
	// Priority 1: Use severityText for exact variant mapping
	if (severityText) {
		const variantClass = SEVERITY_VARIANT_CLASSES[severityText.trim()];
		if (variantClass) {
			return variantClass;
		}
	}

	// Priority 2: Use severityNumber for base color (use middle shade as default)
	if (severityNumber) {
		const logType = getLogTypeBySeverityNumber(severityNumber);
		if (logType !== LogType.UNKNOWN) {
			return `severity-${logType.toLowerCase()}-0`; // Use middle shade (index 2)
		}
	}

	return 'severity-info-0'; // Fallback to CSS classes based on type
}

function LogStateIndicator({
	fontSize,
	severityText,
	severityNumber,
}: {
	fontSize: FontSize;
	severityText?: string;
	severityNumber?: number;
}): JSX.Element {
	const severityClass = getSeverityClass(severityText, severityNumber);

	return (
		<div className="log-state-indicator">
			<div className={cx('line', fontSize, severityClass)} />
		</div>
	);
}

LogStateIndicator.defaultProps = {
	severityText: '',
	severityNumber: 0,
};

export default LogStateIndicator;
