import { Spinner } from '@signozhq/ui/spinner';
import cx from 'classnames';

import styles from './CalendarContainerFallback.module.scss';

function CalendarContainerFallback(): JSX.Element {
	return (
		<div
			className={cx('calendar-container', styles.calendarContainerFallback)}
			data-testid="calendar-container-fallback"
			aria-busy="true"
		>
			<Spinner size={20} />
		</div>
	);
}

export default CalendarContainerFallback;
