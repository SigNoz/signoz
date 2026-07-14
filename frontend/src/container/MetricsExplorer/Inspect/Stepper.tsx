import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import classNames from 'classnames';
import { RefreshCcw, SquareArrowOutUpRight } from '@signozhq/icons';

import { SPACE_AGGREGATION_LINK, TEMPORAL_AGGREGATION_LINK } from './constants';
import { InspectionStep, StepperProps } from './types';

import '../../Home/HomeChecklist/HomeChecklist.styles.scss';

function Stepper({
	inspectionStep,
	resetInspection,
}: StepperProps): JSX.Element {
	return (
		<div className="home-checklist-container">
			<div className="home-checklist-title">
				<Typography.Text>
					👋 Hello, welcome to the Metrics Inspector
				</Typography.Text>
				<Typography.Text>Let’s get you started...</Typography.Text>
			</div>
			<div className="completed-checklist-container whats-next-checklist-container">
				<div
					className={classNames({
						'completed-checklist-item':
							inspectionStep > InspectionStep.TIME_AGGREGATION,
						'whats-next-checklist-item':
							inspectionStep <= InspectionStep.TIME_AGGREGATION,
					})}
				>
					<div
						className={classNames({
							'completed-checklist-item-title':
								inspectionStep > InspectionStep.TIME_AGGREGATION,
							'whats-next-checklist-item-title':
								inspectionStep <= InspectionStep.TIME_AGGREGATION,
						})}
					>
						First, align the data by selecting a{' '}
						<Typography.Link href={TEMPORAL_AGGREGATION_LINK} target="_blank">
							Temporal Aggregation{' '}
							<SquareArrowOutUpRight color={Color.BG_ROBIN_500} size={10} />
						</Typography.Link>
					</div>
				</div>

				<div
					className={classNames({
						'completed-checklist-item':
							inspectionStep > InspectionStep.SPACE_AGGREGATION,
						'whats-next-checklist-item':
							inspectionStep <= InspectionStep.SPACE_AGGREGATION,
					})}
				>
					<div
						className={classNames({
							'completed-checklist-item-title':
								inspectionStep > InspectionStep.SPACE_AGGREGATION,
							'whats-next-checklist-item-title':
								inspectionStep <= InspectionStep.SPACE_AGGREGATION,
						})}
					>
						Add a{' '}
						<Typography.Link href={SPACE_AGGREGATION_LINK} target="_blank">
							Spatial Aggregation{' '}
							<SquareArrowOutUpRight color={Color.BG_ROBIN_500} size={10} />
						</Typography.Link>
					</div>
				</div>
			</div>

			<div className="completed-message-container">
				{inspectionStep === InspectionStep.COMPLETED && (
					<>
						<Typography.Text>
							🎉 Ta-da! You have completed your metric query tutorial.
						</Typography.Text>
						<Typography.Text>
							You can inspect a new metric or reset the query builder.
						</Typography.Text>
						<Button icon={<RefreshCcw size={12} />} onClick={resetInspection}>
							Reset query
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

export default Stepper;
