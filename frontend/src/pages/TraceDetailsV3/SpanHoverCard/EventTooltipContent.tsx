import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { Diamond } from '@signozhq/icons';
import cx from 'classnames';
import { toFixed } from 'utils/toFixed';

import styles from './EventTooltipContent.module.scss';

export interface EventTooltipContentProps {
	eventName: string;
	timeOffsetMs: number;
	isError: boolean;
	attributeMap: Record<string, string>;
}

export function EventTooltipContent({
	eventName,
	timeOffsetMs,
	isError,
	attributeMap,
}: EventTooltipContentProps): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(timeOffsetMs);

	return (
		<div className={styles.root}>
			<div className={styles.header}>
				<Diamond size={10} />
				<span>EVENT DETAILS</span>
			</div>
			<div className={cx(styles.name, isError && styles.hasError)}>
				{eventName}
			</div>
			<div className={styles.time}>
				{toFixed(time, 2)} {timeUnitName} since span start
			</div>
			{Object.keys(attributeMap).length > 0 && (
				<>
					<div className={styles.divider} />
					<div className={styles.attributes}>
						{Object.entries(attributeMap).map(([key, value]) => (
							<div key={key} className={styles.kv}>
								<span className={styles.key}>{key}:</span>{' '}
								<span className={styles.value}>{value}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
