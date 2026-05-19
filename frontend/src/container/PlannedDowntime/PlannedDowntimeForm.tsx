import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from '@signozhq/icons';
import {
	Button,
	DatePicker,
	Flex,
	Form,
	FormInstance,
	Input,
	Modal,
	Select,
	SelectProps,
	Spin,
} from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type { DefaultOptionType } from 'antd/es/select';
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

dayjs.locale('en');
dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_FORMAT = DATE_TIME_FORMATS.TIME;
const DATE_FORMAT = DATE_TIME_FORMATS.ORDINAL_DATE;
const ORDINAL_FORMAT = DATE_TIME_FORMATS.ORDINAL_ONLY;

const TZ_OPTIONS: DefaultOptionType[] = ALL_TIME_ZONES.map(
	(timezone: string) => ({
		label: timezone,
		value: timezone,
		key: timezone,
	}),
);

interface PlannedDowntimeFormData {
	name: string;
	startTime: dayjs.Dayjs | null;
	endTime: dayjs.Dayjs | null;
	recurrence?: AlertmanagertypesRecurrenceDTO;
	alertRules: DefaultOptionType[];
	recurrenceSelect?: AlertmanagertypesRecurrenceDTO;
	timezone?: string;
}

const customFormat = DATE_TIME_FORMATS.ORDINAL_DATETIME;

interface PlannedDowntimeFormProps {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	alertOptions: DefaultOptionType[];
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

	const [selectedTags, setSelectedTags] = React.useState<DefaultOptionType[]>(
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

	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	const requiredFieldRule = [{ required: true }];

	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const saveHandler = useCallback(
		async (values: PlannedDowntimeFormData) => {
			const data: AlertmanagertypesPostablePlannedMaintenanceDTO = {
				alertIds: values.alertRules
					.map((alert) => alert.value)
					.filter((alert) => alert !== undefined) as string[],
				name: values.name,
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
			initialValues.id,
			isEditMode,
			notifications,
			refetchAllSchedules,
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

	const handleAlertRulesChange: SelectProps['onChange'] = (_value, options) => {
		form.setFieldValue(alertRuleFormName, options);
		setSelectedTags(Array.isArray(options) ? options : [options]);
	};

	const noTagRenderer: SelectProps['tagRender'] = () => <></>;

	const handleClose = (removedTag: DefaultOptionType['value']): void => {
		if (!removedTag) {
			return;
		}
		const newTags = selectedTags.filter((tag) => tag.value !== removedTag);
		form.setFieldValue(alertRuleFormName, newTags);
		setSelectedTags(newTags);
	};

	const formattedInitialValues = useMemo((): PlannedDowntimeFormData => {
		const { schedule } = initialValues;
		const startTime = schedule?.recurrence?.startTime || schedule?.startTime;
		const endTime = schedule?.recurrence?.endTime || schedule?.endTime;

		return {
			name: defaultTo(initialValues.name, ''),
			alertRules: getAlertOptionsFromIds(
				initialValues.alertIds || [],
				alertOptions,
			),
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
		};
	}, [initialValues, alertOptions]);

	useEffect(() => {
		setSelectedTags(formattedInitialValues.alertRules);
		form.setFieldsValue({ ...formattedInitialValues });
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
	}, [formData, recurrenceType, timezone]);

	const endTimeText = useMemo((): string => {
		const endTime = formData.endTime;
		if (!endTime) {
			return '';
		}

		const formattedEndTime = endTime.format(TIME_FORMAT);
		const formattedEndDate = endTime.format(DATE_FORMAT);
		return `Scheduled to end maintenance on ${formattedEndDate} at ${formattedEndTime}.`;
	}, [formData, recurrenceType, timezone]);

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
					<Select
						placeholder="Select option..."
						options={recurrenceOptionWithSubmenu}
					/>
				</Form.Item>
				{recurrenceType === recurrenceOptions.weekly.value && (
					<Form.Item
						label="Weekly occurernce"
						name={['recurrence', 'repeatOn']}
						rules={requiredFieldRule}
					>
						<Select
							placeholder="Select option..."
							mode="multiple"
							options={Object.values(recurrenceWeeklyOptions)}
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
									<Select
										defaultValue="m"
										value={durationUnit}
										onChange={(value): void => setDurationUnit(value)}
									>
										<Select.Option value="m">Mins</Select.Option>
										<Select.Option value="h">Hours</Select.Option>
									</Select>
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
					<Select options={TZ_OPTIONS} placeholder="Select timezone" showSearch />
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
					<div className="alert-rule-form">
						<Typography style={{ marginBottom: 8 }}>Silence Alerts</Typography>
						<Typography style={{ marginBottom: 8 }} className="alert-rule-info">
							(Leave empty to silence all alerts)
						</Typography>
					</div>
					<Form.Item noStyle shouldUpdate>
						<AlertRuleTags
							closable
							selectedTags={selectedTags}
							handleClose={handleClose}
						/>
					</Form.Item>
					<Form.Item name={alertRuleFormName}>
						<Select
							placeholder="Search for alerts rules or groups..."
							mode="multiple"
							status={isError ? 'error' : undefined}
							loading={isLoading}
							tagRender={noTagRenderer}
							onChange={handleAlertRulesChange}
							showSearch
							options={alertOptions}
							filterOption={(input, option): boolean =>
								(option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())
							}
							notFoundContent={
								isLoading ? (
									<span>
										<Spin size="small" /> Loading...
									</span>
								) : (
									<span>No alert available.</span>
								)
							}
						>
							{alertOptions?.map((option) => (
								<Select.Option key={option.value} value={option.value}>
									{option.label}
								</Select.Option>
							))}
						</Select>
					</Form.Item>
				</div>
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
