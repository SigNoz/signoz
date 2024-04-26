import './PlannedDowntime.styles.scss';
import 'dayjs/locale/en';

import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	DatePicker,
	Divider,
	Dropdown,
	Flex,
	Form,
	Input,
	MenuProps,
	Modal,
	Select,
	Spin,
	Typography,
} from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { SelectProps } from 'antd/lib';
import getAll from 'api/alerts/getAll';
import {
	ModalButtonWrapper,
	ModalTitle,
} from 'container/PipelinePage/PipelineListsView/styles';
import dayjs from 'dayjs';
import { CalendarClockIcon, PencilRuler, Search, SortDesc } from 'lucide-react';
import React, { ChangeEvent } from 'react';
import { useQuery } from 'react-query';

import { AlertRuleTags, PlannedDowntimeList } from './PlannedDowntimeList';

interface PlannedDowntimeData {
	name: string;
	startTime: string;
	endTime: string;
	recurrence: string;
}

const customFormat = 'Do MMMM, YYYY ⎯ HH:mm:ss';

export function PlannedDowntime(): JSX.Element {
	const [isOpen, setIsOpen] = React.useState(false);
	const [form] = Form.useForm();
	const [selectedTags, setSelectedTags] = React.useState<
		DefaultOptionType | DefaultOptionType[]
	>([]);
	const { data, isError, isLoading } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
		enabled: isOpen,
	});
	const alertRuleFormName = 'alert-rules';

	const alertOptions = React.useMemo(
		() =>
			data?.payload?.map((i) => ({
				label: i.alert,
				value: i.id,
			})),
		[data],
	);

	dayjs.locale('en');
	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const onFinish = (values: PlannedDowntimeData): void => {
		console.log(values);
	};

	const formValidationRules = [
		{
			required: true,
		},
	];

	const handleOk = async (): Promise<void> => {
		try {
			await form.validateFields();
			setIsOpen(false);
		} catch (error) {
			// error
		}
	};

	const [searchValue, setSearchValue] = React.useState<string>('');

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		console.log(searchValue);
	};

	const handleCancel = (): void => {
		setIsOpen(false);
	};

	const handleChange = (
		value: string,
		options: DefaultOptionType | DefaultOptionType[],
	): void => {
		console.log(options, value);
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
		console.log(newTags);
		form.setFieldValue(alertRuleFormName, newTags);
		setSelectedTags(newTags);
	};

	const filterMenuItems: MenuProps['items'] = [
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<PencilRuler size={14} /> Created by
				</div>
			),
			key: '0',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<CalendarClockIcon size={14} /> Last updated by
				</div>
			),
			key: '1',
		},
	];

	return (
		<div className="planned-downtime-container">
			<div className="planned-downtime-content">
				<Typography.Title className="title">Planned Downtime</Typography.Title>
				<Typography.Text className="subtitle">
					Create and manage planned downtimes.
				</Typography.Text>
				<Flex className="toolbar">
					<Dropdown
						overlayClassName="new-downtime-menu"
						menu={{ items: filterMenuItems }}
						placement="bottomLeft"
					>
						<Button
							type="default"
							className="periscope-btn"
							icon={<SortDesc size={14} />}
						>
							Filter
						</Button>
					</Dropdown>
					<Input
						placeholder="Search for a planned downtime..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchValue}
						onChange={handleSearch}
					/>
					<Button
						icon={<PlusOutlined />}
						type="primary"
						onClick={(): void => setIsOpen(true)}
					>
						New downtime
					</Button>
				</Flex>
				<br />
				<PlannedDowntimeList />
			</div>
			<Modal
				title={<ModalTitle level={4}>New planned downtime</ModalTitle>}
				centered
				open={isOpen}
				className="createDowntimeModal"
				width={384}
				onCancel={handleCancel}
				footer={null}
			>
				<Divider plain />
				<Form
					name="create-downtime"
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
					<div className="bar">
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
							label="Ends on"
							name="endTime"
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
					</div>
					<Form.Item
						label="Repeats every"
						name="recurrence"
						required={false}
						rules={formValidationRules}
					>
						<Select>
							<Select.Option value="does-not-repeat">Does not repeat</Select.Option>
						</Select>
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
						<Form.Item name={alertRuleFormName}>
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
							>
								Add downtime schedule
							</Button>
						</ModalButtonWrapper>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}
