import './APIKeys.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Avatar,
	Button,
	Col,
	Collapse,
	Flex,
	Form,
	Input,
	Modal,
	Radio,
	Row,
	Select,
	Table,
	TableProps,
	Tooltip,
	Typography,
} from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { CollapseProps } from 'antd/lib';
import createAPIKeyApi from 'api/APIKeys/createAPIKey';
import deleteAPIKeyApi from 'api/APIKeys/deleteAPIKey';
import updateAPIKeyApi from 'api/APIKeys/updateAPIKey';
import axios, { AxiosError } from 'axios';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import dayjs from 'dayjs';
import { useGetAllAPIKeys } from 'hooks/APIKeys/useGetAllAPIKeys';
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
import { useAppContext } from 'providers/App/App';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { APIKeyProps } from 'types/api/pat/types';
import { USER_ROLES } from 'types/roles';

export const showErrorNotification = (
	notifications: NotificationInstance,
	err: Error,
): void => {
	notifications.error({
		message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
	});
};

type ExpiryOption = {
	value: string;
	label: string;
};

export const EXPIRATION_WITHIN_SEVEN_DAYS = 7;

const API_KEY_EXPIRY_OPTIONS: ExpiryOption[] = [
	{ value: '1', label: '1 day' },
	{ value: '7', label: '1 week' },
	{ value: '30', label: '1 month' },
	{ value: '90', label: '3 months' },
	{ value: '365', label: '1 year' },
	{ value: '0', label: 'No Expiry' },
];

export const isExpiredToken = (expiryTimestamp: number): boolean => {
	if (expiryTimestamp === 0) {
		return false;
	}
	const currentTime = dayjs();
	const tokenExpiresAt = dayjs.unix(expiryTimestamp);
	return tokenExpiresAt.isBefore(currentTime);
};

export const getDateDifference = (
	createdTimestamp: number,
	expiryTimestamp: number,
): number => {
	const differenceInSeconds = Math.abs(expiryTimestamp - createdTimestamp);

	// Convert seconds to days
	return differenceInSeconds / (60 * 60 * 24);
};

function APIKeys(): JSX.Element {
	const { user } = useAppContext();
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
			name: apiKey.name,
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
		isRefetching,
		refetch: refetchAPIKeys,
		error,
		isError,
	} = useGetAllAPIKeys();

	useEffect(() => {
		setActiveAPIKey(APIKeys?.data.data[0]);
	}, [APIKeys]);

	useEffect(() => {
		setDataSource(APIKeys?.data.data || []);
	}, [APIKeys?.data.data]);

	useEffect(() => {
		if (isError) {
			showErrorNotification(notifications, error as AxiosError);
		}
	}, [error, isError, notifications]);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		const filteredData = APIKeys?.data?.data?.filter(
			(key: APIKeyProps) =>
				key &&
				key.name &&
				key.name.toLowerCase().includes(e.target.value.toLowerCase()),
		);
		setDataSource(filteredData || []);
	};

	const clearSearch = (): void => {
		setSearchValue('');
	};

	const { mutate: createAPIKey, isLoading: isLoadingCreateAPIKey } = useMutation(
		createAPIKeyApi,
		{
			onSuccess: (data) => {
				setShowNewAPIKeyDetails(true);
				setActiveAPIKey(data.payload);

				refetchAPIKeys();
			},
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
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
				showErrorNotification(notifications, error as AxiosError);
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
				showErrorNotification(notifications, error as AxiosError);
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
		editForm
			.validateFields()
			.then((values) => {
				if (activeAPIKey) {
					updateAPIKey({
						id: activeAPIKey.id,
						data: {
							name: values.name,
							role: values.role,
						},
					});
				}
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
	};

	const onCreateAPIKey = (): void => {
		createForm
			.validateFields()
			.then((values) => {
				if (user) {
					createAPIKey({
						name: values.name,
						expiresInDays: parseInt(values.expiration, 10),
						role: values.role,
					});
				}
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
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

		return `${formattedDate} ${formattedTime}`;
	};

	const handleCopyClose = (): void => {
		if (activeAPIKey) {
			handleCopyKey(activeAPIKey?.token);
		}

		hideAddViewModal();
	};

	const columns: TableProps<APIKeyProps>['columns'] = [
		{
			title: 'API Key',
			key: 'api-key',
			// eslint-disable-next-line sonarjs/cognitive-complexity
			render: (APIKey: APIKeyProps): JSX.Element => {
				const formattedDateAndTime =
					APIKey && APIKey?.lastUsed && APIKey?.lastUsed !== 0
						? getFormattedTime(APIKey?.lastUsed)
						: 'Never';

				const createdOn = getFormattedTime(APIKey.createdAt);

				const expiresIn =
					APIKey.expiresAt === 0
						? Number.POSITIVE_INFINITY
						: getDateDifference(APIKey?.createdAt, APIKey?.expiresAt);

				const isExpired = isExpiredToken(APIKey.expiresAt);

				const expiresOn =
					!APIKey.expiresAt || APIKey.expiresAt === 0
						? 'No Expiry'
						: getFormattedTime(APIKey.expiresAt);

				const updatedOn =
					!APIKey.updatedAt || APIKey.updatedAt === 0
						? null
						: getFormattedTime(APIKey?.updatedAt);

				const items: CollapseProps['items'] = [
					{
						key: '1',
						label: (
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
											onClick={(e): void => {
												e.stopPropagation();
												e.preventDefault();
												handleCopyKey(APIKey.token);
											}}
										/>
									</div>

									{APIKey.role === USER_ROLES.ADMIN && (
										<Tooltip title={USER_ROLES.ADMIN}>
											<Contact2 size={14} color={Color.BG_ROBIN_400} />
										</Tooltip>
									)}

									{APIKey.role === USER_ROLES.EDITOR && (
										<Tooltip title={USER_ROLES.EDITOR}>
											<ClipboardEdit size={14} color={Color.BG_ROBIN_400} />
										</Tooltip>
									)}

									{APIKey.role === USER_ROLES.VIEWER && (
										<Tooltip title={USER_ROLES.VIEWER}>
											<View size={14} color={Color.BG_ROBIN_400} />
										</Tooltip>
									)}

									{!APIKey.role && (
										<Tooltip title={USER_ROLES.ADMIN}>
											<Contact2 size={14} color={Color.BG_ROBIN_400} />
										</Tooltip>
									)}
								</div>
								<div className="action-btn">
									<Button
										className="periscope-btn ghost"
										icon={<PenLine size={14} />}
										onClick={(e): void => {
											e.stopPropagation();
											e.preventDefault();
											showEditModal(APIKey);
										}}
									/>

									<Button
										className="periscope-btn ghost"
										icon={<Trash2 color={Color.BG_CHERRY_500} size={14} />}
										onClick={(e): void => {
											e.stopPropagation();
											e.preventDefault();
											showDeleteModal(APIKey);
										}}
									/>
								</div>
							</div>
						),
						children: (
							<div className="api-key-info-container">
								{APIKey?.createdByUser && (
									<Row>
										<Col span={6}> Creator </Col>
										<Col span={12} className="user-info">
											<Avatar className="user-avatar" size="small">
												{APIKey?.createdByUser?.name?.substring(0, 1)}
											</Avatar>

											<Typography.Text>{APIKey.createdByUser?.name}</Typography.Text>

											<div className="user-email">{APIKey.createdByUser?.email}</div>
										</Col>
									</Row>
								)}
								<Row>
									<Col span={6}> Created on </Col>
									<Col span={12}>
										<Typography.Text>{createdOn}</Typography.Text>
									</Col>
								</Row>
								{updatedOn && (
									<Row>
										<Col span={6}> Updated on </Col>
										<Col span={12}>
											<Typography.Text>{updatedOn}</Typography.Text>
										</Col>
									</Row>
								)}

								<Row>
									<Col span={6}> Expires on </Col>
									<Col span={12}>
										<Typography.Text>{expiresOn}</Typography.Text>
									</Col>
								</Row>
							</div>
						),
					},
				];

				return (
					<div className="column-render">
						<Collapse items={items} />

						<div className="api-key-details">
							<div className="api-key-last-used-at">
								<CalendarClock size={14} />
								Last used <Minus size={12} />
								<Typography.Text>{formattedDateAndTime}</Typography.Text>
							</div>

							{!isExpired && expiresIn <= EXPIRATION_WITHIN_SEVEN_DAYS && (
								<div
									className={cx(
										'api-key-expires-in',
										expiresIn <= 3 ? 'danger' : 'warning',
									)}
								>
									<span className="dot" /> Expires in {expiresIn} Days
								</div>
							)}

							{isExpired && (
								<div className={cx('api-key-expires-in danger')}>
									<span className="dot" /> Expired
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
						Create and manage API keys for the SigNoz API
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
						pageSize: 5,
						hideOnSinglePage: true,
						showTotal: (total: number, range: number[]): string =>
							`${range[0]}-${range[1]} of ${total} keys`,
					}}
				/>
			</div>

			{/* Delete Key Modal */}
			<Modal
				className="delete-api-key-modal"
				title={<span className="title">Delete Key</span>}
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
						name: activeAPIKey?.name,
						role: activeAPIKey?.role,
					}}
				>
					<Form.Item
						name="name"
						label="Name"
						rules={[{ required: true }, { type: 'string', min: 6 }]}
					>
						<Input placeholder="Enter Key Name" autoFocus />
					</Form.Item>

					<Form.Item name="role" label="Role">
						<Flex vertical gap="middle">
							<Radio.Group
								buttonStyle="solid"
								className="api-key-access-role"
								defaultValue={activeAPIKey?.role}
							>
								<Radio.Button value={USER_ROLES.ADMIN} className={cx('tab')}>
									<div className="role">
										<Contact2 size={14} /> Admin
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.EDITOR} className={cx('tab')}>
									<div className="role">
										<ClipboardEdit size={14} /> Editor
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.VIEWER} className={cx('tab')}>
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
									data-testid="copy-key-close-btn"
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
									test-id="create-new-key"
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
							name: '',
						}}
						layout="vertical"
						autoComplete="off"
					>
						<Form.Item
							name="name"
							label="Name"
							rules={[{ required: true }, { type: 'string', min: 6 }]}
							validateTrigger="onFinish"
						>
							<Input placeholder="Enter Key Name" autoFocus />
						</Form.Item>

						<Form.Item name="role" label="Role">
							<Flex vertical gap="middle">
								<Radio.Group
									buttonStyle="solid"
									className="api-key-access-role"
									defaultValue={USER_ROLES.ADMIN}
								>
									<Radio.Button value={USER_ROLES.ADMIN} className={cx('tab')}>
										<div className="role" data-testid="create-form-admin-role-btn">
											<Contact2 size={14} /> Admin
										</div>
									</Radio.Button>
									<Radio.Button value={USER_ROLES.EDITOR} className="tab">
										<div className="role" data-testid="create-form-editor-role-btn">
											<ClipboardEdit size={14} /> Editor
										</div>
									</Radio.Button>
									<Radio.Button value={USER_ROLES.VIEWER} className="tab">
										<div className="role" data-testid="create-form-viewer-role-btn">
											<Eye size={14} /> Viewer
										</div>
									</Radio.Button>
								</Radio.Group>
							</Flex>
						</Form.Item>
						<Form.Item name="expiration" label="Expiration">
							<Select
								className="expiration-selector"
								placeholder="Expiration"
								options={API_KEY_EXPIRY_OPTIONS}
							/>
						</Form.Item>
					</Form>
				)}

				{showNewAPIKeyDetails && (
					<div className="api-key-info-container">
						<Row>
							<Col span={8}>Key</Col>
							<Col span={16}>
								<span className="copyable-text">
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
								</span>
							</Col>
						</Row>

						<Row>
							<Col span={8}>Name</Col>
							<Col span={16}>{activeAPIKey?.name}</Col>
						</Row>

						<Row>
							<Col span={8}>Role</Col>
							<Col span={16}>
								{activeAPIKey?.role === USER_ROLES.ADMIN && (
									<div className="role">
										<Contact2 size={14} /> Admin
									</div>
								)}
								{activeAPIKey?.role === USER_ROLES.EDITOR && (
									<div className="role">
										{' '}
										<ClipboardEdit size={14} /> Editor
									</div>
								)}
								{activeAPIKey?.role === USER_ROLES.VIEWER && (
									<div className="role">
										{' '}
										<View size={14} /> Viewer
									</div>
								)}
							</Col>
						</Row>

						<Row>
							<Col span={8}>Creator</Col>

							<Col span={16} className="user-info">
								<Avatar className="user-avatar" size="small">
									{activeAPIKey?.createdByUser?.name?.substring(0, 1)}
								</Avatar>

								<Typography.Text>{activeAPIKey?.createdByUser?.name}</Typography.Text>

								<div className="user-email">{activeAPIKey?.createdByUser?.email}</div>
							</Col>
						</Row>

						{activeAPIKey?.createdAt && (
							<Row>
								<Col span={8}>Created on</Col>
								<Col span={16}>{getFormattedTime(activeAPIKey?.createdAt)}</Col>
							</Row>
						)}

						{activeAPIKey?.expiresAt !== 0 && activeAPIKey?.expiresAt && (
							<Row>
								<Col span={8}>Expires on</Col>
								<Col span={16}>{getFormattedTime(activeAPIKey?.expiresAt)}</Col>
							</Row>
						)}

						{activeAPIKey?.expiresAt === 0 && (
							<Row>
								<Col span={8}>Expires on</Col>
								<Col span={16}> No Expiry </Col>
							</Row>
						)}
					</div>
				)}
			</Modal>
		</div>
	);
}

export default APIKeys;
