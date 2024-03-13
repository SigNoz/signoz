import './LogStateIndicator.styles.scss';

import cx from 'classnames';

export const SEVERITY_TEXT_TYPE = {
	Trace: 'Trace',
	TRACE: 'TRACE',
	TRACE2: 'TRACE2',
	TRACE3: 'TRACE3',
	TRACE4: 'TRACE4',
	Debug: 'Debug',
	DEBUG: 'DEBUG',
	DEBUG2: 'DEBUG2',
	DEBUG3: 'DEBUG3',
	DEBUG4: 'DEBUG4',
	Information: 'Information',
	INFO: 'INFO',
	INFO2: 'INFO2',
	INFO3: 'INFO3',
	INFO4: 'INFO4',
	Warning: 'Warning',
	WARN: 'WARN',
	WARN2: 'WARN2',
	WARN3: 'WARN3',
	WARN4: 'WARN4',
	WARNING: 'WARNING',
	Error: 'Error',
	ERROR: 'ERROR',
	ERROR2: 'ERROR2',
	ERROR3: 'ERROR3',
	ERROR4: 'ERROR4',
	Critical: 'Critical',
	FATAL: 'FATAL',
	FATAL2: 'FATAL2',
	FATAL3: 'FATAL3',
	FATAL4: 'FATAL4',
} as const;

export const LogType = {
	INFO: 'INFO',
	WARNING: 'WARNING',
	ERROR: 'ERROR',
} as const;

function LogStateIndicator({
	type,
	isActive,
}: {
	type: string;
	isActive?: boolean;
}): JSX.Element {
	return (
		<div className={cx('log-state-indicator', isActive ? 'isActive' : '')}>
			<div className={cx('line', type)}> </div>
		</div>
	);
}

LogStateIndicator.defaultProps = {
	isActive: false,
};

export default LogStateIndicator;
