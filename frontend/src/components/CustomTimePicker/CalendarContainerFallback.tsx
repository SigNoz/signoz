import { CSSProperties } from 'react';
import { Spinner } from '@signozhq/ui/spinner';
import cx from 'classnames';

import { getCalendarWeekCount } from './calendarUtils';

import styles from './CalendarContainerFallback.module.scss';

function CalendarContainerFallback({
	month,
}: {
	month: Date | undefined;
}): JSX.Element {
	return (
		<div
			className={cx('calendar-container', styles.calendarContainerFallback)}
			style={
				{ '--calendar-week-count': getCalendarWeekCount(month) } as CSSProperties
			}
			data-testid="calendar-container-fallback"
			aria-busy="true"
		>
			<Spinner size={20} />
		</div>
	);
}

export default CalendarContainerFallback;
