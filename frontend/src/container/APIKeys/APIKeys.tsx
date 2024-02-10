import './APIKeys.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Col,
	Flex,
	Form,
	Input,
	Modal,
	Radio,
	Row,
	Select,
	Table,
	TableProps,
	Typography,
} from 'antd';
import createAPIKeyApi from 'api/APIKeys/createAPIKey';
import deleteAPIKeyApi from 'api/APIKeys/deleteAPIKey';
import updateAPIKeyApi from 'api/APIKeys/updateAPIKey';
import axios, { AxiosError } from 'axios';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useGetAllAPIKeys } from 'hooks/APIKeys/useGetAllAPIKeys';
import useErrorNotification from 'hooks/useErrorNotification';
import { useNotifications } from 'hooks/useNotifications';
import {
	CalendarClock,
	Check,
	ClipboardEdit,
	Contact2,
	Copy,
	Eye,
	Minus,
	PenLine,
	Plus,
	Search,
	Trash2,
	View,
	X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { APIKeyProps } from 'types/api/pat/types';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

function APIKeys(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const { notifications } = useNotifications();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [showNewAPIKeyDetails, setShowNewAPIKeyDetails] = useState(false);
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [activeAPIKey, setActiveAPIKey] = useState<APIKeyProps | null>();

	const [searchValue, setSearchValue] = useState<string>('');
	const [dataSource, setDataSource] = useState<APIKeyProps[]>([]);
	const { t } = useTranslation(['apiKeys']);

	const [editForm] = Form.useForm();
	const [createForm] = Form.useForm();

	const handleFormReset = (): void => {
		editForm.resetFields();
		createForm.resetFields();
	};

	const hideDeleteViewModal = (): void => {
		handleFormReset();
		setActiveAPIKey(null);
		setIsDeleteModalOpen(false);
	};

	const showDeleteModal = (apiKey: APIKeyProps): void => {
		setActiveAPIKey(apiKey);
		setIsDeleteModalOpen(true);
	};

	const hideEditViewModal = (): void => {
		handleFormReset();
		setActiveAPIKey(null);
		setIsEditModalOpen(false);
	};

	const hideAddViewModal = (): void => {
		handleFormReset();
		setShowNewAPIKeyDetails(false);
		setActiveAPIKey(null);
		setIsAddModalOpen(false);
	};

	const showEditModal = (apiKey: APIKeyProps): void => {
		handleFormReset();
		setActiveAPIKey(apiKey);

		editForm.setFieldsValue({
			label: apiKey.name,
			role: apiKey.role || USER_ROLES.VIEWER,
		});

		setIsEditModalOpen(true);
	};

	const showAddModal = (): void => {
		setActiveAPIKey(null);
		setIsAddModalOpen(true);
	};

	const handleModalClose = (): void => {
		setActiveAPIKey(null);
	};

	const {
		data: APIKeys,
		isLoading,
		error,
		isRefetching,
		refetch: refetchAPIKeys,
	} = useGetAllAPIKeys();

	useEffect(() => {
		setDataSource(APIKeys?.data.data || []);
	}, [APIKeys?.data.data]);

	useErrorNotification(error);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		const filteredData = APIKeys?.data?.data?.filter((key: any) =>
			key.name.toLowerCase().includes(e.target.value.toLowerCase()),
		);
		setDataSource(filteredData || []);
	};

	const clearSearch = (): void => {
		setSearchValue('');
	};

	const showErrorNotification = (err: AxiosError): void => {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	};

	const { mutate: createAPIKey, isLoading: isLoadingCreateAPIKey } = useMutation(
		createAPIKeyApi,
		{
			onSuccess: (data) => {
				setShowNewAPIKeyDetails(true);
				setActiveAPIKey(data.payload);
			},
			onError: (error) => {
				showErrorNotification(error as AxiosError);
			},
		},
	);

	const { mutate: updateAPIKey, isLoading: isLoadingUpdateAPIKey } = useMutation(
		updateAPIKeyApi,
		{
			onSuccess: () => {
				refetchAPIKeys();
				setIsEditModalOpen(false);
			},
			onError: (error) => {
				showErrorNotification(error as AxiosError);
			},
		},
	);

	const { mutate: deleteAPIKey, isLoading: isDeleteingAPIKey } = useMutation(
		deleteAPIKeyApi,
		{
			onSuccess: () => {
				refetchAPIKeys();
				setIsDeleteModalOpen(false);
			},
			onError: (error) => {
				showErrorNotification(error as AxiosError);
			},
		},
	);

	const onDeleteHandler = (): void => {
		clearSearch();

		if (activeAPIKey) {
			deleteAPIKey(activeAPIKey.id);
		}
	};

	const onUpdateApiKey = (): void => {
		const { label, expiration, role } = editForm.getFieldsValue();

		if (activeAPIKey) {
			updateAPIKey({
				id: activeAPIKey.id,
				data: {
					name: label,
					expiresAt: expiration,
					role,
				},
			});
		}
	};

	const onCreateAPIKey = (): void => {
		const { label, expiration, role } = createForm.getFieldsValue();

		if (user) {
			createAPIKey({
				name: label,
				expiresAt: parseInt(expiration, 10),
				role,
			});
		}
	};

	const handleCopyKey = (text: string): void => {
		handleCopyToClipboard(text);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const getFormattedTime = (epochTime: number): string => {
		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		};
		const formattedTime = new Date(epochTime * 1000).toLocaleTimeString(
			'en-US',
			timeOptions,
		);

		const dateOptions: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		};

		const formattedDate = new Date(epochTime * 1000).toLocaleDateString(
			'en-US',
			dateOptions,
		);

		// Combine time and date
		return `${formattedDate} ${formattedTime}`;
	};

	const handleCopyClose = (): void => {
		if (activeAPIKey) {
			handleCopyKey(activeAPIKey?.token);
		}

		refetchAPIKeys();

		hideAddViewModal();
	};

	const columns: TableProps<APIKeyProps>['columns'] = [
		{
			title: 'API Key',
			key: 'api-key',
			render: (APIKey: APIKeyProps): JSX.Element => {
				let formattedDateAndTime = '';

				if (APIKey && APIKey.createdAt) {
					formattedDateAndTime = getFormattedTime(APIKey.createdAt);
				}

				const expiringInLessThan7Days = parseInt(APIKey.id, 10) % 2 === 0;

				// this is to simulate the UI. Will update once BE finalises format and sends info correctly

				return (
					<div className="column-render">
						<div className="title-with-action">
							<div className="api-key-data">
								<div className="api-key-title">
									<Typography.Text>{APIKey?.name}</Typography.Text>
								</div>

								<div className="api-key-value">
									<Typography.Text>
										{APIKey?.token.substring(0, 2)}********
										{APIKey?.token.substring(APIKey.token.length - 2).trim()}
									</Typography.Text>

									<Copy
										className="copy-key-btn"
										size={12}
										onClick={(): void => handleCopyKey(APIKey.token)}
									/>
								</div>

								{APIKey.role === USER_ROLES.ADMIN && (
									<Contact2 size={14} color={Color.BG_ROBIN_400} />
								)}

								{APIKey.role === USER_ROLES.EDITOR && (
									<ClipboardEdit size={14} color={Color.BG_ROBIN_400} />
								)}

								{APIKey.role === USER_ROLES.VIEWER && (
									<View size={14} color={Color.BG_ROBIN_400} />
								)}

								{!APIKey.role && <View size={14} color={Color.BG_ROBIN_400} />}
							</div>

							<div className="action-btn">
								<PenLine size={14} onClick={(): void => showEditModal(APIKey)} />

								<Trash2
									size={14}
									color={Color.BG_CHERRY_500}
									onClick={(): void => showDeleteModal(APIKey)}
								/>
							</div>
						</div>

						<div className="api-key-details">
							<div className="api-key-created-at">
								<CalendarClock size={14} />
								Last used <Minus size={12} />
								<Typography.Text> {formattedDateAndTime} </Typography.Text>
							</div>

							{expiringInLessThan7Days && (
								<div className="api-key-expires-in">
									Expires in {APIKey.expiresAt} Days
								</div>
							)}
						</div>
					</div>
				);
			},
		},
	];

	return (
		<div className="api-key-container">
			<div className="api-key-content">
				<header>
					<Typography.Title className="title">API Keys</Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage access keys for the SigNoz API
					</Typography.Text>
				</header>

				<div className="api-keys-search-add-new">
					<Input
						placeholder="Search for keys..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchValue}
						onChange={handleSearch}
					/>

					<Button
						className="add-new-api-key-btn"
						type="primary"
						onClick={showAddModal}
					>
						<Plus size={14} /> New Key
					</Button>
				</div>

				<Table
					columns={columns}
					dataSource={dataSource}
					loading={isLoading || isRefetching}
					showHeader={false}
					pagination={{
						pageSize: 10,
						showTotal: (total: number, range: number[]): string =>
							`${range[0]}-${range[1]} of ${total} API Keys`,
					}}
				/>
			</div>

			{/* Delete Key Modal */}
			<Modal
				className="delete-api-key-modal"
				title={<span className="title">Delete key</span>}
				open={isDeleteModalOpen}
				closable
				afterClose={handleModalClose}
				onCancel={hideDeleteViewModal}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={hideDeleteViewModal}
						className="cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						icon={<Trash2 size={16} />}
						loading={isDeleteingAPIKey}
						onClick={onDeleteHandler}
						className="delete-btn"
					>
						Delete key
					</Button>,
				]}
			>
				<Typography.Text className="delete-text">
					{t('delete_confirm_message', {
						keyName: activeAPIKey?.name,
					})}
				</Typography.Text>
			</Modal>

			{/* Edit Key Modal */}
			<Modal
				className="api-key-modal"
				title="Edit key"
				open={isEditModalOpen}
				key="edit-api-key-modal"
				afterClose={handleModalClose}
				// closable
				onCancel={hideEditViewModal}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={hideEditViewModal}
						className="periscope-btn cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						className="periscope-btn primary"
						key="submit"
						type="primary"
						loading={isLoadingUpdateAPIKey}
						icon={<Check size={14} />}
						onClick={onUpdateApiKey}
					>
						Update key
					</Button>,
				]}
			>
				<Form
					name="edit-api-key-form"
					key={activeAPIKey?.id}
					form={editForm}
					layout="vertical"
					autoComplete="off"
					initialValues={{
						label: activeAPIKey?.name,
						role: activeAPIKey?.role,
					}}
				>
					<Form.Item
						name="label"
						label="Label"
						rules={[{ required: true }, { type: 'string', min: 6 }]}
					>
						<Input placeholder="Top Secret" />
					</Form.Item>

					<Form.Item name="role" label="Role">
						<Flex vertical gap="middle">
							<Radio.Group
								buttonStyle="solid"
								className="api-key-access-role"
								value={activeAPIKey?.role}
							>
								<Radio.Button
									value={USER_ROLES.ADMIN}
									className={cx(
										'tab',
										editForm.getFieldValue('role') === USER_ROLES.ADMIN ? 'selected' : '',
									)}
								>
									<div className="role">
										<Contact2 size={14} /> Admin
									</div>
								</Radio.Button>
								<Radio.Button
									value={USER_ROLES.EDITOR}
									className={cx(
										'tab',
										editForm.getFieldValue('role') === USER_ROLES.EDITOR
											? 'selected'
											: '',
									)}
								>
									<div className="role">
										<ClipboardEdit size={14} /> Editor
									</div>
								</Radio.Button>
								<Radio.Button
									value={USER_ROLES.VIEWER}
									className={cx(
										'tab',
										editForm.getFieldValue('role') === USER_ROLES.VIEWER
											? 'selected'
											: '',
									)}
								>
									<div className="role">
										<Eye size={14} /> Viewer
									</div>
								</Radio.Button>
							</Radio.Group>
						</Flex>
					</Form.Item>
				</Form>
			</Modal>

			{/* Create New Key Modal */}
			<Modal
				className="api-key-modal"
				title="Create new key"
				open={isAddModalOpen}
				key="create-api-key-modal"
				closable
				onCancel={hideAddViewModal}
				destroyOnClose
				footer={
					showNewAPIKeyDetails
						? [
								<Button
									key="copy-key-close"
									className="periscope-btn primary"
									type="primary"
									onClick={handleCopyClose}
									icon={<Check size={12} />}
								>
									Copy key and close
								</Button>,
						  ]
						: [
								<Button
									key="cancel"
									onClick={hideAddViewModal}
									className="periscope-btn cancel-btn"
									icon={<X size={16} />}
								>
									Cancel
								</Button>,
								<Button
									className="periscope-btn primary"
									key="submit"
									type="primary"
									icon={<Check size={14} />}
									loading={isLoadingCreateAPIKey}
									onClick={onCreateAPIKey}
								>
									Create new key
								</Button>,
						  ]
				}
			>
				{!showNewAPIKeyDetails && (
					<Form
						key="createForm"
						name="create-api-key-form"
						form={createForm}
						initialValues={{
							role: USER_ROLES.ADMIN,
							expiration: '1',
							label: '',
						}}
						layout="vertical"
						autoComplete="off"
					>
						<Form.Item
							name="label"
							label="Label"
							rules={[{ required: true }, { type: 'string', min: 6 }]}
						>
							<Input placeholder="Top Secret" />
						</Form.Item>

						<Form.Item name="role" label="Role" rules={[{ required: true }]}>
							<Flex vertical gap="middle">
								<Radio.Group
									buttonStyle="solid"
									className="api-key-access-role"
									defaultValue={USER_ROLES.ADMIN}
								>
									<Radio.Button value={USER_ROLES.ADMIN} className={cx('tab')}>
										<div className="role">
											<Contact2 size={14} /> Admin
										</div>
									</Radio.Button>
									<Radio.Button value={USER_ROLES.EDITOR} className="tab">
										<div className="role">
											<ClipboardEdit size={14} /> Editor
										</div>
									</Radio.Button>
									<Radio.Button value={USER_ROLES.VIEWER} className="tab">
										<div className="role">
											<Eye size={14} /> Viewer
										</div>
									</Radio.Button>
								</Radio.Group>
							</Flex>
						</Form.Item>
						<Form.Item
							name="expiration"
							label="Expiration"
							rules={[{ required: true }]}
						>
							<Select
								className="expiration-selector"
								placeholder="Expiration"
								options={[
									{
										value: '1',
										label: '1 day',
									},
									{
										value: '7',
										label: '1 week',
									},
									{
										value: '30',
										label: '1 month',
									},
									{
										value: '90',
										label: '3 months',
									},
									{
										value: '365',
										label: '1 year',
									},
									{
										value: 'noExpiry',
										label: 'No Expiry',
									},
								]}
							/>
						</Form.Item>
					</Form>
				)}

				{showNewAPIKeyDetails && (
					<div className="newAPIKeyDetails">
						<Row>
							<Col span={8}>Key</Col>
							<Col span={12} className="copyable-text">
								<Typography.Text>
									{activeAPIKey?.token.substring(0, 2)}****************
									{activeAPIKey?.token.substring(activeAPIKey.token.length - 2).trim()}
								</Typography.Text>

								<Copy
									className="copy-key-btn"
									size={12}
									onClick={(): void => {
										if (activeAPIKey) {
											handleCopyKey(activeAPIKey.token);
										}
									}}
								/>
							</Col>
						</Row>

						<Row>
							<Col span={8}>ID</Col>
							<Col span={12} className="copyable-text">
								<Typography.Text>
									{activeAPIKey?.token.substring(0, 2)}****************
									{activeAPIKey?.token.substring(activeAPIKey.token.length - 2).trim()}
								</Typography.Text>

								<Copy
									className="copy-key-btn"
									size={12}
									onClick={(): void => {
										if (activeAPIKey) {
											handleCopyKey(activeAPIKey.id);
										}
									}}
								/>
							</Col>
						</Row>

						<Row>
							<Col span={8}>Label</Col>
							<Col span={12}>{activeAPIKey?.name}</Col>
						</Row>

						<Row>
							<Col span={8}>Role</Col>
							<Col span={12}>{activeAPIKey?.role}</Col>
						</Row>

						<Row>
							<Col span={8}>Creator</Col>
							<Col span={12}>{activeAPIKey?.createdBy}</Col>
						</Row>

						<Row>
							<Col span={8}>Created on</Col>
							<Col span={12}>{activeAPIKey?.createdAt}</Col>
						</Row>

						<Row>
							<Col span={8}>Expires on</Col>
							<Col span={12}>{activeAPIKey?.expiresAt}</Col>
						</Row>
					</div>
				)}
			</Modal>
		</div>
	);
}

export default APIKeys;
