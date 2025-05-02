/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/no-identical-functions */
import './PlannedDowntime.styles.scss';
import 'dayjs/locale/en';

import { CheckOutlined } from '@ant-design/icons';
import {
	Button,
	DatePicker,
	Divider,
	Form,
	FormInstance,
	Input,
	Modal,
	Select,
	Spin,
	Typography,
} from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { SelectProps } from 'antd/lib';
import {
	DowntimeSchedules,
	Recurrence,
} from 'api/plannedDowntime/getAllDowntimeSchedules';
import { DowntimeScheduleUpdatePayload } from 'api/plannedDowntime/updateDowntimeSchedule';
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_TIME_ZONES } from 'utils/timeZoneUtil';

import { AlertRuleTags } from './PlannedDowntimeList';
import {
	createEditDowntimeSchedule,
	getAlertOptionsFromIds,
	getDurationInfo,
	getEndTime,
	handleTimeConversion,
	isScheduleRecurring,
	recurrenceOptions,
	recurrenceOptionWithSubmenu,
	recurrenceWeeklyOptions,
} from './PlannedDowntimeutils';

dayjs.locale('en');
dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_FORMAT = DATE_TIME_FORMATS.TIME;
const DATE_FORMAT = DATE_TIME_FORMATS.ORDINAL_DATE;
const ORDINAL_FORMAT = DATE_TIME_FORMATS.ORDINAL_ONLY;

interface PlannedDowntimeFormData {
	name: string;
	startTime: dayjs.Dayjs | string;
	endTime: dayjs.Dayjs | string;
	recurrence?: Recurrence | null;
	alertRules: DefaultOptionType[];
	recurrenceSelect?: Recurrence;
	timezone?: string;
}

const customFormat = DATE_TIME_FORMATS.ORDINAL_DATETIME;

interface PlannedDowntimeFormProps {
	initialValues: Partial<
		DowntimeSchedules & {
			editMode: boolean;
		}
	>;
	alertOptions: DefaultOptionType[];
	isError: boolean;
	isLoading: boolean;
	isOpen: boolean;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	refetchAllSchedules: () => void;
	isEditMode: boolean;
	form: FormInstance<any>;
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

	const [selectedTags, setSelectedTags] = React.useState<
		DefaultOptionType | DefaultOptionType[]
	>([]);
	const alertRuleFormName = 'alertRules';
	const [saveLoading, setSaveLoading] = useState(false);
	const [durationUnit, setDurationUnit] = useState<string>(
		getDurationInfo(initialValues.schedule?.recurrence?.duration as string)
			?.unit || 'm',
	);

	const [formData, setFormData] = useState<PlannedDowntimeFormData>(
		initialValues?.schedule as PlannedDowntimeFormData,
	);

	const [recurrenceType, setRecurrenceType] = useState<string | null>(
		(initialValues.schedule?.recurrence?.repeatType as string) ||
			recurrenceOptions.doesNotRepeat.value,
	);

	const timezoneInitialValue = !isEmpty(initialValues.schedule?.timezone)
		? (initialValues.schedule?.timezone as string)
		: undefined;

	const { notifications } = useNotifications();

	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const saveHanlder = useCallback(
		async (values: PlannedDowntimeFormData) => {
			const shouldKeepLocalTime = !isEditMode;
			const createEditProps: DowntimeScheduleUpdatePayload = {
				data: {
					alertIds: values.alertRules
						.map((alert) => alert.value)
						.filter((alert) => alert !== undefined) as string[],
					name: values.name,
					schedule: {
						startTime: handleTimeConversion(
							values.startTime,
							timezoneInitialValue,
							values.timezone,
							shouldKeepLocalTime,
						),
						timezone: values.timezone,
						endTime: values.endTime
							? handleTimeConversion(
									values.endTime,
									timezoneInitialValue,
									values.timezone,
									shouldKeepLocalTime,
							  )
							: undefined,
						recurrence: values.recurrence as Recurrence,
					},
				},
				id: isEditMode ? initialValues.id : undefined,
			};

			setSaveLoading(true);
			try {
				const response = await createEditDowntimeSchedule({ ...createEditProps });
				if (response.message === 'success') {
					setIsOpen(false);
					notifications.success({
						message: 'Success',
						description: isEditMode
							? 'Schedule updated successfully'
							: 'Schedule created successfully',
					});
					refetchAllSchedules();
				} else {
					notifications.error({
						message: 'Error',
						description: response.error || 'unexpected_error',
					});
				}
			} catch (e) {
				notifications.error({
					message: 'Error',
					description: 'unexpected_error',
				});
			}
			setSaveLoading(false);
		},
		[
			initialValues.id,
			isEditMode,
			notifications,
			refetchAllSchedules,
			setIsOpen,
			timezoneInitialValue,
		],
	);
	const onFinish = async (values: PlannedDowntimeFormData): Promise<void> => {
		const recurrenceData: Recurrence | undefined =
			values?.recurrence?.repeatType === recurrenceOptions.doesNotRepeat.value
				? undefined
				: {
						duration: values.recurrence?.duration
							? `${values.recurrence?.duration}${durationUnit}`
							: undefined,
						endTime: !isEmpty(values.endTime)
							? handleTimeConversion(
									values.endTime,
									timezoneInitialValue,
									values.timezone,
									!isEditMode,
							  )
							: undefined,
						startTime: handleTimeConversion(
							values.startTime,
							timezoneInitialValue,
							values.timezone,
							!isEditMode,
						),
						repeatOn: !values.recurrence?.repeatOn?.length
							? undefined
							: values.recurrence?.repeatOn,
						repeatType: values.recurrence?.repeatType,
				  };

		const payloadValues = { ...values, recurrence: recurrenceData };
		await saveHanlder(payloadValues);
	};

	const formValidationRules = [
		{
			required: true,
		},
	];

	const handleOk = async (): Promise<void> => {
		try {
			await form.validateFields();
		} catch (error) {
			console.error(error);
		}
	};

	const handleCancel = (): void => {
		setIsOpen(false);
	};

	const handleChange = (
		_value: string,
		options: DefaultOptionType | DefaultOptionType[],
	): void => {
		form.setFieldValue(alertRuleFormName, options);
		setSelectedTags(options);
	};

	const noTagRenderer: SelectProps['tagRender'] = () => (
		// eslint-disable-next-line react/jsx-no-useless-fragment
		<></>
	);

	const handleClose = (removedTag: DefaultOptionType['value']): void => {
		if (!removedTag) {
			return;
		}
		const newTags = selectedTags.filter(
			(tag: DefaultOptionType) => tag.value !== removedTag,
		);
		form.setFieldValue(alertRuleFormName, newTags);
		setSelectedTags(newTags);
	};

	const formatedInitialValues = useMemo(() => {
		const formData: PlannedDowntimeFormData = {
			name: defaultTo(initialValues.name, ''),
			alertRules: getAlertOptionsFromIds(
				initialValues.alertIds || [],
				alertOptions,
			),
			endTime: getEndTime(initialValues) ? dayjs(getEndTime(initialValues)) : '',
			startTime: initialValues.schedule?.startTime
				? dayjs(initialValues.schedule?.startTime)
				: '',
			recurrence: {
				...initialValues.schedule?.recurrence,
				repeatType: !isScheduleRecurring(initialValues?.schedule)
					? recurrenceOptions.doesNotRepeat.value
					: (initialValues.schedule?.recurrence?.repeatType as string),
				duration: getDurationInfo(
					initialValues.schedule?.recurrence?.duration as string,
				)?.value,
			},
			timezone: initialValues.schedule?.timezone as string,
		};
		return formData;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialValues]);

	useEffect(() => {
		setSelectedTags(formatedInitialValues.alertRules);
		form.setFieldsValue({ ...formatedInitialValues });
	}, [form, formatedInitialValues, initialValues]);

	const timeZoneItems: DefaultOptionType[] = ALL_TIME_ZONES.map(
		(timezone: string) => ({
			label: timezone,
			value: timezone,
			key: timezone,
		}),
	);

	const getTimezoneFormattedTime = (
		time: string | dayjs.Dayjs,
		timeZone?: string,
		isEditMode?: boolean,
		format?: string,
	): string => {
		if (!time) {
			return '';
		}
		if (!timeZone) {
			return dayjs(time).format(format);
		}
		return dayjs(time).tz(timeZone, isEditMode).format(format);
	};

	const startTimeText = useMemo((): string => {
		let startTime = formData?.startTime;
		if (recurrenceType !== recurrenceOptions.doesNotRepeat.value) {
			startTime = formData?.recurrence?.startTime || formData?.startTime || '';
		}

		if (!startTime) {
			return '';
		}

		if (formData.timezone) {
			startTime = handleTimeConversion(
				startTime,
				timezoneInitialValue,
				formData?.timezone,
				!isEditMode,
			);
		}
		const daysOfWeek = formData?.recurrence?.repeatOn;

		const formattedStartTime = getTimezoneFormattedTime(
			startTime,
			formData.timezone,
			!isEditMode,
			TIME_FORMAT,
		);

		const formattedStartDate = getTimezoneFormattedTime(
			startTime,
			formData.timezone,
			!isEditMode,
			DATE_FORMAT,
		);

		const ordinalFormat = getTimezoneFormattedTime(
			startTime,
			formData.timezone,
			!isEditMode,
			ORDINAL_FORMAT,
		);

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
	}, [formData, recurrenceType, isEditMode, timezoneInitialValue]);

	const endTimeText = useMemo((): string => {
		let endTime = formData?.endTime;
		if (recurrenceType !== recurrenceOptions.doesNotRepeat.value) {
			endTime = formData?.recurrence?.endTime || '';

			if (!isEditMode && !endTime) {
				endTime = formData?.endTime || '';
			}
		}

		if (!endTime) {
			return '';
		}

		if (formData.timezone) {
			endTime = handleTimeConversion(
				endTime,
				timezoneInitialValue,
				formData?.timezone,
				!isEditMode,
			);
		}

		const formattedEndTime = getTimezoneFormattedTime(
			endTime,
			formData.timezone,
			!isEditMode,
			TIME_FORMAT,
		);

		const formattedEndDate = getTimezoneFormattedTime(
			endTime,
			formData.timezone,
			!isEditMode,
			DATE_FORMAT,
		);
		return `Scheduled to end maintenance on ${formattedEndDate} at ${formattedEndTime}.`;
	}, [formData, recurrenceType, isEditMode, timezoneInitialValue]);

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
			width={384}
			onCancel={handleCancel}
			footer={null}
		>
			<Divider plain />
			<Form<PlannedDowntimeFormData>
				name={initialValues.editMode ? 'edit-form' : 'create-form'}
				form={form}
				layout="vertical"
				className="createForm"
				onFinish={onFinish}
				onValuesChange={(): void => {
					setRecurrenceType(form.getFieldValue('recurrence')?.repeatType as string);
					setFormData(form.getFieldsValue());
				}}
				autoComplete="off"
			>
				<Form.Item label="Name" name="name" rules={formValidationRules}>
					<Input placeholder="e.g. Upgrade downtime" />
				</Form.Item>
				<Form.Item
					label="Starts from"
					name="startTime"
					rules={formValidationRules}
					className={!isEmpty(startTimeText) ? 'formItemWithBullet' : ''}
					getValueProps={(value): any => ({
						value: value ? dayjs(value).tz(timezoneInitialValue) : undefined,
					})}
				>
					<DatePicker
						format={(date): string =>
							dayjs(date).tz(timezoneInitialValue).format(customFormat)
						}
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
					rules={formValidationRules}
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
						rules={formValidationRules}
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
							rules={formValidationRules}
						>
							<Input
								addonAfter={
									<Select
										defaultValue="m"
										value={durationUnit}
										onChange={(value): void => {
											setDurationUnit(value);
										}}
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
				<Form.Item label="Timezone" name="timezone" rules={formValidationRules}>
					<Select options={timeZoneItems} placeholder="Select timezone" showSearch />
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
					getValueProps={(value): any => ({
						value: value ? dayjs(value).tz(timezoneInitialValue) : undefined,
					})}
				>
					<DatePicker
						format={(date): string =>
							dayjs(date).tz(timezoneInitialValue).format(customFormat)
						}
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
							onChange={handleChange}
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
							icon={<CheckOutlined />}
							onClick={handleOk}
							loading={saveLoading || isLoading}
						>
							{isEditMode ? 'Update downtime schedule' : 'Add downtime schedule'}
						</Button>
					</ModalButtonWrapper>
				</Form.Item>
			</Form>
		</Modal>
	);
}
