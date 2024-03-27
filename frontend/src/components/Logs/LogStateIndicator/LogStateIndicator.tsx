import './LogStateIndicator.styles.scss';

import cx from 'classnames';

export const SEVERITY_TEXT_TYPE = {
	TRACE: 'TRACE',
	DEBUG: 'DEBUG',
	INFO: 'INFO',
	WARN: 'WARN',
	ERROR: 'ERROR',
	FATAL: 'FATAL',
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
