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
import {
	ModalButtonWrapper,
	ModalTitle,
} from 'container/PipelinePage/PipelineListsView/styles';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo, isEmpty } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_TIME_ZONES } from 'utils/timeZoneUtil';

import {
	DropdownWithSubMenu,
	Option,
	recurrenceOption,
} from './DropdownWithSubMenu/DropdownWithSubMenu';
import { AlertRuleTags } from './PlannedDowntimeList';
import {
	createEditDowntimeSchedule,
	getAlertOptionsFromIds,
	getDurationInfo,
	recurrenceOptions,
} from './PlannedDowntimeutils';

dayjs.locale('en');
interface PlannedDowntimeFormData {
	name: string;
	startTime: dayjs.Dayjs | string;
	endTime: dayjs.Dayjs | string;
	recurrence?: Recurrence | null;
	alertRules: DefaultOptionType[];
	recurrenceSelect?: Recurrence;
	timezone?: string;
}

const customFormat = 'Do MMMM, YYYY ⎯ HH:mm:ss';

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
	const [durationUnit, setDurationUnit] = useState<string>('m');
	const [selectedRecurrenceOption, setSelectedRecurrenceOption] = useState<
		string | null
	>();

	const { notifications } = useNotifications();

	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const saveHanlder = useCallback(
		async (values: PlannedDowntimeFormData) => {
			const formatDate = (date: string | dayjs.Dayjs): string | undefined =>
				!isEmpty(date) ? dayjs(date).format('YYYY-MM-DDTHH:mm:ss[Z]') : undefined;

			const createEditProps: DowntimeScheduleUpdatePayload = {
				data: {
					alertIds: values.alertRules
						.map((alert) => alert.value)
						.filter((alert) => alert !== undefined) as string[],
					name: values.name,
					schedule: {
						startTime: formatDate(values.startTime),
						timezone: values.timezone,
						endTime: formatDate(values.endTime),
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
		[initialValues.id, isEditMode, notifications, refetchAllSchedules, setIsOpen],
	);
	const onFinish = async (values: PlannedDowntimeFormData): Promise<void> => {
		const recurrenceData: Recurrence | undefined =
			(values?.recurrenceSelect?.repeatType as Option)?.value ===
			recurrenceOptions.doesNotRepeat.value
				? undefined
				: {
						duration: values.recurrence?.duration
							? `${values.recurrence?.duration}${durationUnit}`
							: undefined,
						endTime: !isEmpty(values.endTime)
							? (values.endTime as string)
							: undefined,
						startTime: values.startTime as string,
						repeatOn: !values?.recurrenceSelect?.repeatOn?.length
							? undefined
							: values?.recurrenceSelect?.repeatOn,
						repeatType: (values?.recurrenceSelect?.repeatType as Option)?.value,
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
			endTime: initialValues.schedule?.endTime
				? dayjs(initialValues.schedule?.endTime)
				: '',
			startTime: initialValues.schedule?.startTime
				? dayjs(initialValues.schedule?.startTime)
				: '',
			recurrenceSelect: initialValues.schedule?.recurrence
				? initialValues.schedule?.recurrence
				: {
						repeatType: recurrenceOptions.doesNotRepeat,
				  },
			recurrence: {
				...initialValues.schedule?.recurrence,
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
				autoComplete="off"
			>
				<Form.Item
					label="Name"
					name="name"
					required={false}
					rules={formValidationRules}
				>
					<Input placeholder="e.g. Upgrade downtime" />
				</Form.Item>
				<Form.Item
					label="Starts from"
					name="startTime"
					required={false}
					rules={formValidationRules}
					className="formItemWithBullet"
				>
					<DatePicker
						format={customFormat}
						showTime
						renderExtraFooter={datePickerFooter}
						popupClassName="datePicker"
					/>
				</Form.Item>
				<Form.Item
					label="Repeats every"
					name="recurrenceSelect"
					required={false}
					rules={formValidationRules}
				>
					<DropdownWithSubMenu
						options={recurrenceOption}
						form={form}
						setRecurrenceOption={setSelectedRecurrenceOption}
					/>
				</Form.Item>
				{selectedRecurrenceOption !== recurrenceOptions.doesNotRepeat.value && (
					<Form.Item
						label="Duration"
						name={['recurrence', 'duration']}
						required={false}
						rules={formValidationRules}
					>
						<Input
							addonAfter={
								<Select
									defaultValue="m"
									value={
										getDurationInfo(
											initialValues.schedule?.recurrence?.duration as string,
										)?.unit
									}
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
				)}{' '}
				<Form.Item
					label="Timezone"
					name="timezone"
					required={false}
					rules={formValidationRules}
				>
					<Select options={timeZoneItems} placeholder="Select timezone" showSearch />
				</Form.Item>
				<Form.Item
					label="Ends on"
					name="endTime"
					required={false}
					rules={[
						{
							required:
								selectedRecurrenceOption === recurrenceOptions.doesNotRepeat.value,
						},
					]}
					className="formItemWithBullet"
				>
					<DatePicker
						format={customFormat}
						showTime
						renderExtraFooter={datePickerFooter}
						popupClassName="datePicker"
					/>
				</Form.Item>
				<div>
					<Typography style={{ marginBottom: 8 }}>Silence Alerts</Typography>
					<Form.Item noStyle shouldUpdate>
						<AlertRuleTags
							closable
							selectedTags={selectedTags}
							handleClose={handleClose}
						/>
					</Form.Item>
					<Form.Item name={alertRuleFormName} rules={formValidationRules}>
						<Select
							placeholder="Search for alerts rules or groups..."
							mode="multiple"
							status={isError ? 'error' : undefined}
							loading={isLoading}
							tagRender={noTagRenderer}
							onChange={handleChange}
							options={alertOptions}
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
