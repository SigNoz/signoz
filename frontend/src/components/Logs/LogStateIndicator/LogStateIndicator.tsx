import './LogStateIndicator.styles.scss';

import cx from 'classnames';
import { FontSize } from 'container/OptionsMenu/types';

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

function LogStateIndicator({
	type,
	fontSize,
}: {
	type: string;
	fontSize: FontSize;
}): JSX.Element {
	return (
		<div className="log-state-indicator">
			<div className={cx('line', type, fontSize)}> </div>
		</div>
	);
}

export default LogStateIndicator;
