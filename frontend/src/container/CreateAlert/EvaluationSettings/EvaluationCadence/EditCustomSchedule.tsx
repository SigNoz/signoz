import { useMemo } from 'react';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useCreateAlertState } from 'container/CreateAlert/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlert/context/constants';
import { IEditCustomScheduleProps } from 'container/CreateAlert/EvaluationSettings/types';
import { Calendar1, Pencil, Trash } from '@signozhq/icons';

function EditCustomSchedule({
	setIsEvaluationCadenceDetailsVisible,
	setIsPreviewVisible,
}: IEditCustomScheduleProps): JSX.Element {
	const { advancedOptions, setAdvancedOptions } = useCreateAlertState();

	const displayText = useMemo(() => {
		if (advancedOptions.evaluationCadence.mode === 'custom') {
			return (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						Every
					</Typography>
					<Typography
						variant="paragraph"
						size="base"
						weight="medium"
						color="secondary"
						as="span"
						display="inline-block"
						marginX={2}
						paddingX={4}
						textOverflow="wrap"
					>
						{advancedOptions.evaluationCadence.custom.repeatEvery
							.charAt(0)
							.toUpperCase() +
							advancedOptions.evaluationCadence.custom.repeatEvery.slice(1)}
					</Typography>
					{advancedOptions.evaluationCadence.custom.repeatEvery !== 'day' && (
						<>
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								on
							</Typography>
							<Typography
								variant="paragraph"
								size="base"
								weight="medium"
								color="secondary"
								as="span"
								display="inline-block"
								marginX={2}
								paddingX={4}
								textOverflow="wrap"
							>
								{advancedOptions.evaluationCadence.custom.occurence
									.map(
										(occurence) => occurence.charAt(0).toUpperCase() + occurence.slice(1),
									)
									.join(', ')}
							</Typography>
						</>
					)}
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						at
					</Typography>
					<Typography
						variant="paragraph"
						size="base"
						weight="medium"
						color="secondary"
						as="span"
						display="inline-block"
						marginX={2}
						paddingX={4}
						textOverflow="wrap"
					>
						{advancedOptions.evaluationCadence.custom.startAt}
					</Typography>
				</Typography>
			);
		}
		return (
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Starting on
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="secondary"
					as="span"
					display="inline-block"
					marginX={2}
					paddingX={4}
					textOverflow="wrap"
				>
					{advancedOptions.evaluationCadence.rrule.date?.format('DD/MM/YYYY')}
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					at
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="secondary"
					as="span"
					display="inline-block"
					marginX={2}
					paddingX={4}
					textOverflow="wrap"
				>
					{advancedOptions.evaluationCadence.rrule.startAt}
				</Typography>
			</Typography>
		);
	}, [advancedOptions.evaluationCadence]);

	const handleEdit = (): void => {
		setIsEvaluationCadenceDetailsVisible(true);
	};

	const handlePreview = (): void => {
		setIsPreviewVisible(true);
	};

	const handleDiscard = (): void => {
		setIsEvaluationCadenceDetailsVisible(false);
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE',
			payload: INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
		});
		setAdvancedOptions({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'default',
		});
	};

	return (
		<div className="edit-custom-schedule">
			{displayText}
			<div className="button-row">
				<Button.Group>
					<Button type="default" onClick={handleEdit}>
						<Pencil size={12} />
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Edit custom schedule
						</Typography>
					</Button>
					<Button type="default" onClick={handlePreview}>
						<Calendar1 size={12} />
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Preview
						</Typography>
					</Button>
					<Button
						data-testid="discard-button"
						type="default"
						onClick={handleDiscard}
					>
						<Trash size={12} />
					</Button>
				</Button.Group>
			</div>
		</div>
	);
}

export default EditCustomSchedule;
