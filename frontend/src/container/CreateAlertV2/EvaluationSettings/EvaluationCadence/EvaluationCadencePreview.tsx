import { useMemo } from 'react';
import { Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Calendar, Info } from '@signozhq/icons';

import { useCreateAlertState } from '../../context';
import { TIMEZONE_DATA } from '../constants';
import { IEvaluationCadencePreviewProps, IScheduleListProps } from '../types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
} from '../utils';
import styles from './styles.module.scss';

export function ScheduleList({
	schedule,
	currentTimezone,
}: IScheduleListProps): JSX.Element {
	if (schedule && schedule.length > 0) {
		return (
			<div className={styles.schedulePreview} data-testid="schedule-preview">
				<div className={styles.schedulePreviewHeader}>
					<Calendar size={16} />
					<Typography.Text className={styles.schedulePreviewTitle}>
						Schedule Preview
					</Typography.Text>
				</div>
				<div className={styles.schedulePreviewList}>
					{schedule.map((date) => (
						<div key={date.toISOString()} className={styles.schedulePreviewItem}>
							<div className={styles.schedulePreviewTimeline}>
								<div className={styles.schedulePreviewTimelineLine} />
							</div>
							<div className={styles.schedulePreviewContent}>
								<div className={styles.schedulePreviewDate}>
									{date.toLocaleDateString('en-US', {
										weekday: 'short',
										month: 'short',
										day: 'numeric',
									})}
									,{' '}
									{date.toLocaleTimeString('en-US', {
										hour12: false,
										hour: '2-digit',
										minute: '2-digit',
										second: '2-digit',
									})}
								</div>
								<div className={styles.schedulePreviewSeparator} />
								<div className={styles.schedulePreviewTimezone}>
									{
										TIMEZONE_DATA.find((timezone) => timezone.value === currentTimezone)
											?.label
									}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className={styles.noSchedule} data-testid="no-schedule">
			<Info size={32} />
			<Typography.Text>
				Please fill the relevant information to generate a schedule
			</Typography.Text>
		</div>
	);
}

function EvaluationCadencePreview({
	isOpen,
	setIsOpen,
}: IEvaluationCadencePreviewProps): JSX.Element {
	const { advancedOptions } = useCreateAlertState();

	const schedule = useMemo(() => {
		if (advancedOptions.evaluationCadence.mode === 'rrule') {
			return buildAlertScheduleFromRRule(
				advancedOptions.evaluationCadence.rrule.rrule,
				advancedOptions.evaluationCadence.rrule.date,
				advancedOptions.evaluationCadence.rrule.startAt,
				15,
			);
		}
		return buildAlertScheduleFromCustomSchedule(
			advancedOptions.evaluationCadence.custom.repeatEvery,
			advancedOptions.evaluationCadence.custom.occurence,
			advancedOptions.evaluationCadence.custom.startAt,
			15,
		);
	}, [advancedOptions.evaluationCadence]);

	return (
		<Modal
			open={isOpen}
			onCancel={(): void => setIsOpen(false)}
			footer={null}
			className={styles.evaluationCadencePreviewModal}
			width={800}
			centered
		>
			<div
				className={`${styles.evaluationCadenceDetails} ${styles.evaluationCadencePreview}`}
			>
				<div
					className={`${styles.evaluationCadenceDetailsContent} ${styles.evaluationCadencePreviewContent}`}
				>
					<div
						className={`${styles.evaluationCadenceDetailsContentRow} ${styles.evaluationCadencePreviewContentRow}`}
					>
						<ScheduleList
							schedule={schedule}
							currentTimezone={advancedOptions.evaluationCadence.custom.timezone}
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
}

export default EvaluationCadencePreview;
