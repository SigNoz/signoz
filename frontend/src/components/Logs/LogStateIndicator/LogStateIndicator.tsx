import './LogStateIndicator.styles.scss';

import cx from 'classnames';

export const LogType = {
	INFO: 'INFO',
	WARNING: 'WARNING',
	ERROR: 'ERROR',
};

export default function LogStateIndicator({
	type,
}: {
	type: string;
}): JSX.Element {
	return (
		<div className="log-state-indicator">
			<div className={cx('line', type)}> </div>
		</div>
	);
}
