import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Info } from '@signozhq/icons';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { SelectSimple, SelectSimpleItem } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import {
	Button,
	DatePicker,
	Flex,
	Form,
	FormInstance,
	Input,
	Modal,
	Tooltip,
} from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	createDowntimeSchedule,
	updateDowntimeScheduleByID,
} from 'api/generated/services/downtimeschedules';
import type {
	AlertmanagertypesPlannedMaintenanceDTO,
	AlertmanagertypesPostablePlannedMaintenanceDTO,
	AlertmanagertypesRecurrenceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import {
	ModalButtonWrapper,
	ModalTitle,
} from 'container/PipelinePage/PipelineListsView/styles';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo, isEmpty } from 'lodash-es';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { ALL_TIME_ZONES } from 'utils/timeZoneUtil';

import 'dayjs/locale/en';

import { AlertRuleTags } from './PlannedDowntimeList';
import {
	getAlertOptionsFromIds,
	getDurationInfo,
	isScheduleRecurring,
	recurrenceOptions,
	recurrenceOptionWithSubmenu,
	recurrenceWeeklyOptions,
} from './PlannedDowntimeutils';

import './PlannedDowntime.styles.scss';
import { RadioGroupItem } from '@signozhq/ui/radio-group';
import { RadioGroup } from '@signozhq/ui/radio-group';

dayjs.locale('en');
dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_FORMAT = DATE_TIME_FORMATS.TIME;
const DATE_FORMAT = DATE_TIME_FORMATS.ORDINAL_DATE;
const ORDINAL_FORMAT = DATE_TIME_FORMATS.ORDINAL_ONLY;

const TZ_OPTIONS: ComboboxSimpleItem[] = ALL_TIME_ZONES.map(
	(timezone: string) => ({
		label: timezone,
		value: timezone,
	}),
);

type AlertRuleScope = 'all' | 'specific';

const DURATION_UNIT_OPTIONS: SelectSimpleItem[] = [
	{ value: 'm', label: 'Mins' },
	{ value: 'h', label: 'Hours' },
];

const WEEKLY_OPTIONS: ComboboxSimpleItem[] = Object.values(
	recurrenceWeeklyOptions,
);

const RECURRENCE_OPTIONS: ComboboxSimpleItem[] =
	recurrenceOptionWithSubmenu.map((opt) => ({
		value: opt.value,
		label: opt.label,
	}));

interface PlannedDowntimeFormData {
	name: string;
	startTime: dayjs.Dayjs | null;
	endTime: dayjs.Dayjs | null;
	recurrence?: AlertmanagertypesRecurrenceDTO;
	alertRuleScope: AlertRuleScope;
	alertRules: ComboboxSimpleItem[];
	recurrenceSelect?: AlertmanagertypesRecurrenceDTO;
	timezone?: string;
	scope?: string;
}

const customFormat = DATE_TIME_FORMATS.ORDINAL_DATETIME;

interface PlannedDowntimeFormProps {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	alertOptions: ComboboxSimpleItem[];
	isError: boolean;
	isLoading: boolean;
	isOpen: boolean;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	refetchAllSchedules: () => void;
	isEditMode: boolean;
	form: FormInstance;
}

export function PlannedDowntimeForm(
	props: PlannedDowntimeFormProps,
): JSX.Element {
	const {
		initialValues,
		alertOptions,
		isError,
		isLoading,
		isOpen,
		setIsOpen,
		refetchAllSchedules,
		isEditMode,
		form,
	} = props;

	const [selectedTags, setSelectedTags] = React.useState<ComboboxSimpleItem[]>(
		[],
	);
	const alertRuleFormName = 'alertRules';
	const [saveLoading, setSaveLoading] = useState(false);
	const [durationUnit, setDurationUnit] = useState<string>(
		getDurationInfo(initialValues.schedule?.recurrence?.duration)?.unit || 'm',
	);

	const [formData, setFormData] = useState<Partial<PlannedDowntimeFormData>>({
		timezone: initialValues.schedule?.timezone,
	});

	const [recurrenceType, setRecurrenceType] = useState<string>(
		initialValues.schedule?.recurrence?.repeatType ||
			recurrenceOptions.doesNotRepeat.value,
	);

	const [alertRuleScope, setAlertRuleScope] = useState<AlertRuleScope>(
		initialValues.id && (initialValues.alertIds || []).length === 0
			? 'all'
			: 'specific',
	);

	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	const requiredFieldRule = [{ required: true }];

	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const saveHandler = useCallback(
		async (values: Omit<PlannedDowntimeFormData, 'alertRules'>) => {
			const data: AlertmanagertypesPostablePlannedMaintenanceDTO = {
				alertIds:
					alertRuleScope === 'all'
						? []
						: (selectedTags
								.map((alert) => alert.value)
								.filter((alert) => alert !== undefined) as string[]),
				name: values.name,
				scope: values.scope,
				schedule: {
					startTime: values.startTime?.format(),
					endTime: values.endTime?.format(),
					timezone: values.timezone!,
					recurrence: values.recurrence,
				},
			};

			setSaveLoading(true);
			try {
				if (isEditMode && initialValues.id) {
					await updateDowntimeScheduleByID({ id: initialValues.id }, data);
				} else {
					await createDowntimeSchedule(data);
				}
				setIsOpen(false);
				notifications.success({
					message: 'Success',
					description: isEditMode
						? 'Schedule updated successfully'
						: 'Schedule created successfully',
				});
				refetchAllSchedules();
			} catch (e: unknown) {
				showErrorModal(
					convertToApiError(e as AxiosError<RenderErrorResponseDTO>) as APIError,
				);
			}
			setSaveLoading(false);
		},
		[
			alertRuleScope,
			initialValues.id,
			isEditMode,
			notifications,
			refetchAllSchedules,
			selectedTags,
			setIsOpen,
			showErrorModal,
		],
	);
	const onFinish = async (values: PlannedDowntimeFormData): Promise<void> => {
		const { recurrence } = values;
		const recurrenceData =
			!recurrence ||
			recurrence.repeatType === recurrenceOptions.doesNotRepeat.value
				? undefined
				: {
						duration: recurrence.duration
							? `${recurrence.duration}${durationUnit}`
							: '',
						startTime: values.startTime!.format(),
						endTime: values.endTime?.format(),
						repeatOn: recurrence.repeatOn,
						repeatType: recurrence.repeatType,
					};

		await saveHandler({
			...values,
			recurrence: recurrenceData,
		});
	};

	const handleFormData = (data: Partial<PlannedDowntimeFormData>): void => {
		const { startTime, endTime, timezone } = data;
		const update: Partial<PlannedDowntimeFormData> = {};

		// If the set timezone doesn't match, update it.
		if (
			startTime &&
			timezone &&
			startTime.format() !== startTime.tz(timezone, true).format()
		) {
			update.startTime = startTime.tz(timezone, true);
		}
		if (
			endTime &&
			timezone &&
			endTime.format() !== endTime.tz(timezone, true).format()
		) {
			update.endTime = endTime.tz(timezone, true);
		}

		if (!isEmpty(update)) {
			data = { ...data, ...update };
			form.setFieldsValue({ ...update });
		}

		setFormData(data);
	};

	const handleOk = async (): Promise<void> => {
		await form.validateFields().catch(() => {
			// antd renders inline field-level errors; nothing more to do here.
		});
	};

	const handleCancel = (): void => setIsOpen(false);

	const handleAlertRulesChange = (value: string | string[]): void => {
		const values = Array.isArray(value) ? value : [value];
		const newOptions = alertOptions.filter((opt) => values.includes(opt.value));
		form.setFieldValue(alertRuleFormName, values);
		setSelectedTags(newOptions);
	};

	const handleClose = (removedTag: string | undefined): void => {
		if (!removedTag) {
			return;
		}
		const newTags = selectedTags.filter((tag) => tag.value !== removedTag);
		form.setFieldValue(
			alertRuleFormName,
			newTags.map((tag) => tag.value),
		);
		setSelectedTags(newTags);
	};

	const formattedInitialValues = useMemo((): PlannedDowntimeFormData => {
		const { schedule } = initialValues;
		const startTime = schedule?.recurrence?.startTime || schedule?.startTime;
		const endTime = schedule?.recurrence?.endTime || schedule?.endTime;

		const initialAlertIds = initialValues.alertIds || [];

		return {
			name: defaultTo(initialValues.name, ''),
			alertRuleScope:
				isEditMode && initialAlertIds.length === 0 ? 'all' : 'specific',
			alertRules: getAlertOptionsFromIds(initialAlertIds, alertOptions),
			startTime: startTime ? dayjs(startTime).tz(schedule.timezone) : null,
			endTime: endTime ? dayjs(endTime).tz(schedule.timezone) : null,
			recurrence: {
				...schedule?.recurrence,
				repeatType: !isScheduleRecurring(schedule)
					? recurrenceOptions.doesNotRepeat.value
					: schedule?.recurrence?.repeatType,
				duration: getDurationInfo(schedule?.recurrence?.duration)?.value ?? '',
			} as AlertmanagertypesRecurrenceDTO,
			timezone: schedule?.timezone as string,
			scope: initialValues.scope || '',
		};
	}, [initialValues, alertOptions]);

	useEffect(() => {
		setSelectedTags(formattedInitialValues.alertRules);
		setAlertRuleScope(formattedInitialValues.alertRuleScope);
		form.setFieldsValue({
			...formattedInitialValues,
			alertRules: formattedInitialValues.alertRules.map((rule) => rule.value),
		});
	}, [form, formattedInitialValues, initialValues]);

	const startTimeText = useMemo((): string => {
		const startTime = formData.startTime;
		if (!startTime) {
			return '';
		}

		const daysOfWeek = formData.recurrence?.repeatOn;

		const formattedStartTime = startTime.format(TIME_FORMAT);
		const formattedStartDate = startTime.format(DATE_FORMAT);
		const ordinalFormat = startTime.format(ORDINAL_FORMAT);

		const formattedDaysOfWeek = daysOfWeek?.join(', ');
		switch (recurrenceType) {
			case 'daily':
				return `Scheduled from ${formattedStartDate}, daily starting at ${formattedStartTime}.`;
			case 'monthly':
				return `Scheduled from ${formattedStartDate}, monthly on the ${ordinalFormat} starting at ${formattedStartTime}.`;
			case 'weekly':
				return `Scheduled from ${formattedStartDate}, weekly ${
					formattedDaysOfWeek ? `on [${formattedDaysOfWeek}]` : ''
				} starting at ${formattedStartTime}`;
			default:
				return `Scheduled for ${formattedStartDate} starting at ${formattedStartTime}.`;
		}
	}, [formData, recurrenceType]);

	const endTimeText = useMemo((): string => {
		const endTime = formData.endTime;
		if (!endTime) {
			return '';
		}

		const formattedEndTime = endTime.format(TIME_FORMAT);
		const formattedEndDate = endTime.format(DATE_FORMAT);
		return `Scheduled to end maintenance on ${formattedEndDate} at ${formattedEndTime}.`;
	}, [formData, recurrenceType]);

	const selectedAlertRuleValues = useMemo(
		() => selectedTags.map((tag) => tag.value),
		[selectedTags],
	);

	return (
		<Modal
			title={
				<ModalTitle level={4}>
					{isEditMode ? 'Edit planned downtime' : 'New planned downtime'}
				</ModalTitle>
			}
			centered
			open={isOpen}
			className="createDowntimeModal"
			onCancel={handleCancel}
			footer={null}
		>
			<Form<PlannedDowntimeFormData>
				name={isEditMode ? 'edit-form' : 'create-form'}
				form={form}
				layout="vertical"
				className="createForm"
				onFinish={onFinish}
				onValuesChange={(): void => {
					setRecurrenceType(form.getFieldValue('recurrence')?.repeatType as string);
					setAlertRuleScope(form.getFieldValue('alertRuleScope') as AlertRuleScope);
					handleFormData(form.getFieldsValue());
				}}
				autoComplete="off"
			>
				<Form.Item label="Name" name="name" rules={requiredFieldRule}>
					<Input placeholder="e.g. Upgrade downtime" />
				</Form.Item>
				<Form.Item
					label="Starts from"
					name="startTime"
					rules={requiredFieldRule}
					className={!isEmpty(startTimeText) ? 'formItemWithBullet' : ''}
				>
					<DatePicker
						format={(date) => date.format(customFormat)}
						showTime
						renderExtraFooter={datePickerFooter}
						showNow={false}
						popupClassName="datePicker"
					/>
				</Form.Item>
				{!isEmpty(startTimeText) && (
					<div className="scheduleTimeInfoText">{startTimeText}</div>
				)}
				<Form.Item
					label="Repeats every"
					name={['recurrence', 'repeatType']}
					rules={requiredFieldRule}
				>
					<ComboboxSimple
						placeholder="Select option..."
						items={RECURRENCE_OPTIONS}
					/>
				</Form.Item>
				{recurrenceType === recurrenceOptions.weekly.value && (
					<Form.Item
						label="Weekly occurernce"
						name={['recurrence', 'repeatOn']}
						rules={requiredFieldRule}
					>
						<ComboboxSimple
							placeholder="Select option..."
							multiple
							items={WEEKLY_OPTIONS}
						/>
					</Form.Item>
				)}
				{recurrenceType &&
					recurrenceType !== recurrenceOptions.doesNotRepeat.value && (
						<Form.Item
							label="Duration"
							name={['recurrence', 'duration']}
							rules={requiredFieldRule}
						>
							<Input
								addonAfter={
									<SelectSimple
										items={DURATION_UNIT_OPTIONS}
										defaultValue="m"
										value={durationUnit}
										onChange={(value): void => setDurationUnit(value as string)}
									/>
								}
								className="duration-input"
								type="number"
								placeholder="Enter duration"
								min={1}
								onWheel={(e): void => e.currentTarget.blur()}
							/>
						</Form.Item>
					)}
				<Form.Item label="Timezone" name="timezone" rules={requiredFieldRule}>
					<ComboboxSimple items={TZ_OPTIONS} placeholder="Select timezone" />
				</Form.Item>
				<Form.Item
					label="Ends on"
					name="endTime"
					required={recurrenceType === recurrenceOptions.doesNotRepeat.value}
					rules={[
						{
							required: recurrenceType === recurrenceOptions.doesNotRepeat.value,
						},
					]}
					className={!isEmpty(endTimeText) ? 'formItemWithBullet' : ''}
				>
					<DatePicker
						format={(date) => date.format(customFormat)}
						showTime
						showNow={false}
						renderExtraFooter={datePickerFooter}
						popupClassName="datePicker"
					/>
				</Form.Item>
				{!isEmpty(endTimeText) && (
					<div className="scheduleTimeInfoText">{endTimeText}</div>
				)}
				<div>
					<Typography style={{ marginBottom: 8 }}>Silence Alerts</Typography>
					<Form.Item
						name="alertRuleScope"
						initialValue="specific"
						className="alert-rule-scope"
					>
						<RadioGroup>
							<RadioGroupItem value="all">All alert rules</RadioGroupItem>
							<RadioGroupItem value="specific">Specific alert rules</RadioGroupItem>
						</RadioGroup>
					</Form.Item>
					{alertRuleScope === 'specific' && (
						<>
							<Form.Item noStyle shouldUpdate>
								<AlertRuleTags
									closable
									selectedTags={selectedTags}
									handleClose={handleClose}
								/>
							</Form.Item>
							<Form.Item
								name={alertRuleFormName}
								rules={[
									{
										validator: async (
											_rule,
											value: string[] | undefined,
										): Promise<void> => {
											if (!value || value.length === 0) {
												throw new Error(
													'Select at least one alert rule, or choose "All alert rules" to silence everything.',
												);
											}
										},
									},
								]}
							>
								<ComboboxSimple
									placeholder="Search for alert rules or groups..."
									multiple
									loading={isLoading}
									onChange={handleAlertRulesChange}
									value={selectedAlertRuleValues}
									items={alertOptions}
									emptyPlaceholder={isLoading ? 'Loading...' : 'No alert available.'}
									className={isError ? 'has-error' : undefined}
									maxDisplayedPills={2}
								/>
							</Form.Item>
						</>
					)}
				</div>
				<Form.Item
					label={
						<span>
							Scope&nbsp;
							<Tooltip
								mouseLeaveDelay={0.3}
								title={
									<span>
										Scope the planned downtime by alert labels.{' '}
										<a
											href="https://signoz.io/docs/alerts-management/planned-maintenance/#scoping-with-label-expressions"
											target="_blank"
											rel="noopener noreferrer"
										>
											Learn more
										</a>
									</span>
								}
							>
								<Info size={13} />
							</Tooltip>
						</span>
					}
					name="scope"
				>
					<Input.TextArea
						placeholder='e.g. env = "prod" AND region = "us-east-1"'
						autoSize={{ minRows: 2, maxRows: 4 }}
					/>
				</Form.Item>
				<Form.Item style={{ marginBottom: 0 }}>
					<ModalButtonWrapper>
						<Button
							key="submit"
							type="primary"
							htmlType="submit"
							onClick={handleOk}
							loading={saveLoading || isLoading}
							className="downtime-schedule-btn"
						>
							<Flex align="center" gap={4}>
								<Check size={16} />
								{isEditMode ? 'Update downtime schedule' : 'Add downtime schedule'}
							</Flex>
						</Button>
					</ModalButtonWrapper>
				</Form.Item>
			</Form>
		</Modal>
	);
}
