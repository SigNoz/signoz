import { Modal, Typography } from 'antd';
import { Calendar, Info } from 'lucide-react';
import { useMemo } from 'react';

import { useCreateAlertState } from '../../context';
import { TIMEZONE_DATA } from '../constants';
import { IEvaluationCadencePreviewProps, IScheduleListProps } from '../types';
import {
	buildAlertScheduleFromCustomSchedule,
	buildAlertScheduleFromRRule,
} from '../utils';

export function ScheduleList({
	schedule,
	currentTimezone,
}: IScheduleListProps): JSX.Element {
	if (schedule && schedule.length > 0) {
		return (
			<div className="schedule-preview" data-testid="schedule-preview">
				<div className="schedule-preview-header">
					<Calendar size={16} />
					<Typography.Text className="schedule-preview-title">
						Schedule Preview
					</Typography.Text>
				</div>
				<div className="schedule-preview-list">
					{schedule.map((date) => (
						<div key={date.toISOString()} className="schedule-preview-item">
							<div className="schedule-preview-timeline">
								<div className="schedule-preview-timeline-line" />
							</div>
							<div className="schedule-preview-content">
								<div className="schedule-preview-date">
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
								<div className="schedule-preview-separator" />
								<div className="schedule-preview-timezone">
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
		<div className="no-schedule" data-testid="no-schedule">
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
			className="evaluation-cadence-preview-modal"
			width={800}
			centered
		>
			<div className="evaluation-cadence-details evaluation-cadence-preview">
				<div className="evaluation-cadence-details-content">
					<div className="evaluation-cadence-details-content-row">
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
