import './IngestionSettings.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Col,
	Collapse,
	DatePicker,
	Form,
	Input,
	Modal,
	Row,
	Select,
	Table,
	TableProps,
	Tag,
	Typography,
} from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { CollapseProps } from 'antd/lib';
import createIngestionKeyApi from 'api/IngestionKeys/createIngestionKey';
import deleteIngestionKey from 'api/IngestionKeys/deleteIngestionKey';
import deleteLimitsForIngestionKey from 'api/IngestionKeys/limits/deleteLimitsForIngestionKey';
import createLimitForIngestionKeyApi from 'api/IngestionKeys/limits/createLimitsForKey';
import updateIngestionKey from 'api/IngestionKeys/updateIngestionKey';
import updateLimitForIngestionKey from 'api/IngestionKeys/limits/updateLimitsForIngestionKey';
import { AxiosError } from 'axios';
import Tags from 'components/Tags/Tags';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import dayjs, { Dayjs } from 'dayjs';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
import { useNotifications } from 'hooks/useNotifications';
import {
	CalendarClock,
	Check,
	Copy,
	Infinity,
	Minus,
	PenLine,
	Plus,
	PlusIcon,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { IngestionKeyProps, Limit } from 'types/api/ingestionKeys/types';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { LimitProps, LimitsProps } from './Limits/Limits';

const { Option } = Select;

const BYTES = 1073741824;

export const disabledDate = (current: Dayjs): boolean =>
	// Disable all dates before today
	current && current < dayjs().endOf('day');

const SIGNALS = ['logs', 'traces', 'metrics'];

export const showErrorNotification = (
	notifications: NotificationInstance,
	err: Error,
): void => {
	notifications.error({
		message: err.message || SOMETHING_WENT_WRONG,
	});
};

type ExpiryOption = {
	value: string;
	label: string;
};

export const API_KEY_EXPIRY_OPTIONS: ExpiryOption[] = [
	{ value: '1', label: '1 day' },
	{ value: '7', label: '1 week' },
	{ value: '30', label: '1 month' },
	{ value: '90', label: '3 months' },
	{ value: '365', label: '1 year' },
	{ value: '0', label: 'No Expiry' },
];

function IngestionSettings(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const { notifications } = useNotifications();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [, handleCopyToClipboard] = useCopyToClipboard();
	const [updatedTags, setUpdatedTags] = useState<string[]>([]);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [activeAPIKey, setActiveAPIKey] = useState<IngestionKeyProps | null>();
	const [activeSignal, setActiveSignal] = useState<string | null>(null);

	const [searchValue, setSearchValue] = useState<string>('');
	const [dataSource, setDataSource] = useState<IngestionKeyProps[]>([]);

	const [
		hasCreateLimitForIngestionKeyError,
		setHasCreateLimitForIngestionKeyError,
	] = useState(false);
	const { t } = useTranslation(['ingestionKeys']);

	const [editForm] = Form.useForm();
	const [addEditLimitForm] = Form.useForm();
	const [createForm] = Form.useForm();

	const handleFormReset = (): void => {
		editForm.resetFields();
		createForm.resetFields();
		addEditLimitForm.resetFields();
	};

	const hideDeleteViewModal = (): void => {
		console.log('hide delete modal');
		setIsDeleteModalOpen(false);
		setActiveAPIKey(null);
		handleFormReset();

		console.log('hide delete modal', activeAPIKey);
	};

	const showDeleteModal = (apiKey: IngestionKeyProps): void => {
		setActiveAPIKey(apiKey);
		setIsDeleteModalOpen(true);
	};

	const hideEditViewModal = (): void => {
		console.log('hide edit modal');

		setActiveAPIKey(null);
		setIsEditModalOpen(false);
		handleFormReset();

		console.log('hide edit modal', activeAPIKey);
	};

	const hideAddViewModal = (): void => {
		handleFormReset();
		setActiveAPIKey(null);
		setIsAddModalOpen(false);
	};

	const showEditModal = (apiKey: IngestionKeyProps): void => {
		console.log('show edit modal', apiKey);

		setActiveAPIKey(apiKey);

		handleFormReset();
		setUpdatedTags(apiKey.tags || []);
		setIsEditModalOpen(true);
	};

	const showAddModal = (): void => {
		setUpdatedTags([]);
		setActiveAPIKey(null);
		setIsAddModalOpen(true);
	};

	const handleModalClose = (): void => {
		console.log('modal close', activeAPIKey);
		setActiveAPIKey(null);
		setActiveSignal(null);
	};

	const {
		data: IngestionKeys,
		isLoading,
		isRefetching,
		refetch: refetchAPIKeys,
		error,
		isError,
	} = useGetAllIngestionsKeys();

	useEffect(() => {
		setActiveAPIKey(IngestionKeys?.data.data[0]);
	}, [IngestionKeys]);

	useEffect(() => {
		setDataSource(IngestionKeys?.data.data || []);
	}, [IngestionKeys?.data.data]);

	useEffect(() => {
		if (isError) {
			showErrorNotification(notifications, error as AxiosError);
		}
	}, [error, isError, notifications]);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		const filteredData = IngestionKeys?.data?.data?.filter(
			(key: IngestionKeyProps) =>
				key &&
				key.name &&
				key.name.toLowerCase().includes(e.target.value.toLowerCase()),
		);
		setDataSource(filteredData || []);
	};

	const clearSearch = (): void => {
		setSearchValue('');
	};

	const {
		mutate: createIngestionKey,
		isLoading: isLoadingCreateAPIKey,
	} = useMutation(createIngestionKeyApi, {
		onSuccess: (data) => {
			setActiveAPIKey(data.payload);
			setUpdatedTags([]);
			hideAddViewModal();
			refetchAPIKeys();
		},
		onError: (error) => {
			showErrorNotification(notifications, error as AxiosError);
		},
	});

	const { mutate: updateAPIKey, isLoading: isLoadingUpdateAPIKey } = useMutation(
		updateIngestionKey,
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
		deleteIngestionKey,
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

	const {
		mutate: createLimitForIngestionKey,
		isLoading: isLoadingLimitForKey,
		error: createLimitForIngestionKeyError,
	} = useMutation(createLimitForIngestionKeyApi, {
		onSuccess: () => {
			setUpdatedTags([]);
			hideAddViewModal();
			refetchAPIKeys();
			setHasCreateLimitForIngestionKeyError(false);
		},
		onError: (error) => {
			console.log('on error', error);
			setHasCreateLimitForIngestionKeyError(true);
			// showErrorNotification(notifications, error as AxiosError);
		},
	});

	const { mutate: deleteLimitForKey, isLoading: isDeletingLimit } = useMutation(
		deleteLimitsForIngestionKey,
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
							tags: updatedTags,
						},
					});
				}
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
	};

	const onCreateIngestionKey = (): void => {
		createForm
			.validateFields()
			.then((values) => {
				if (user) {
					const requestPayload = {
						name: values.name,
						tags: updatedTags,
						expires_at: dayjs(values.expires_at).endOf('day').toISOString(),
					};

					createIngestionKey(requestPayload);
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

	const getFormattedTime = (date: string): string =>
		dayjs(date).format('MMM DD,YYYY, hh:mm a');

	const handleAddLimit = (
		APIKey: IngestionKeyProps,
		signalName: string,
	): void => {
		setActiveSignal(signalName);

		const { dailyLimit, secondsLimit } = addEditLimitForm.getFieldsValue();

		const payload = {
			keyId: APIKey.id,
			signal: signalName,
			config: {
				day: {
					size: parseInt(dailyLimit, 10) * BYTES,
				},
				second: {
					size: parseInt(secondsLimit, 10) * BYTES,
				},
			},
		};

		createLimitForIngestionKey(payload);
	};

	const enableEditLimitMode = (
		APIKey: IngestionKeyProps,
		signalName: string,
	): void => {
		setActiveAPIKey(APIKey);
		setActiveSignal(signalName);
	};

	const handleDeleteLimit = (
		APIKey: IngestionKeyProps,
		signal: LimitsProps,
	): void => {
		console.log('delete - api key', APIKey);
		console.log('signalName key', signal);

		if (signal) {
			deleteLimitForKey(signal.id);
		}
	};

	const handleDiscardSaveLimit = (): void => {
		setHasCreateLimitForIngestionKeyError(false);
		setActiveAPIKey(null);
		setActiveSignal(null);

		addEditLimitForm.resetFields();
	};

	const handleSaveLimit = (
		APIKey: IngestionKeyProps,
		signal: string,
		addOrUpdate: string,
	): void => {
		if (addOrUpdate === 'add') {
			handleAddLimit(APIKey, signal);
		} else {
			// handleAddLimit(APIKey, signal);
		}
	};

	const getFormattedLimit = (size: number | undefined): number => {
		if (!size) {
			return 1;
		}

		return size / BYTES;
	};

	const columns: TableProps<IngestionKeyProps>['columns'] = [
		{
			title: 'Ingestion Key',
			key: 'ingestion-key',
			// eslint-disable-next-line sonarjs/cognitive-complexity
			render: (APIKey: IngestionKeyProps): JSX.Element => {
				const createdOn = getFormattedTime(APIKey.created_at);
				const formattedDateAndTime =
					APIKey && APIKey?.expires_at && getFormattedTime(APIKey?.expires_at);

				const updatedOn = getFormattedTime(APIKey?.updated_at);

				const limits: { [key: string]: Limit } = {};

				APIKey.limits?.forEach((limit: Limit) => {
					limits[limit.signal] = limit;
				});

				const hasLimits = (signal: string): boolean => !!limits[signal];

				console.log('limits', limits);

				const items: CollapseProps['items'] = [
					{
						key: '1',
						label: (
							<div className="title-with-action">
								<div className="ingestion-key-data">
									<div className="ingestion-key-title">
										<Typography.Text>{APIKey?.name}</Typography.Text>
									</div>

									<div className="ingestion-key-value">
										<Typography.Text>
											{APIKey?.value.substring(0, 2)}********
											{APIKey?.value.substring(APIKey.value.length - 2).trim()}
										</Typography.Text>

										<Copy
											className="copy-key-btn"
											size={12}
											onClick={(e): void => {
												e.stopPropagation();
												e.preventDefault();
												handleCopyKey(APIKey.value);
											}}
										/>
									</div>
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
							<div className="ingestion-key-info-container">
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

								{APIKey.tags && Array.isArray(APIKey.tags) && APIKey.tags.length > 0 && (
									<Row>
										<Col span={6}> Tags </Col>
										<Col span={12}>
											<div className="ingestion-key-tags-container">
												<div className="ingestion-key-tags">
													{APIKey.tags.map((tag, index) => (
														// eslint-disable-next-line react/no-array-index-key
														<Tag key={`${tag}-${index}`}> {tag} </Tag>
													))}
												</div>
											</div>
										</Col>
									</Row>
								)}

								<div className="limits-container">
									<h4 className=""> LIMITS </h4>

									<div className="limits-data">
										<div className="signals">
											{SIGNALS.map((signal) => (
												<div className="signal" key={signal}>
													<div className="header">
														<div className="signal-name">{signal}</div>
														<div className="actions">
															{hasLimits(signal) ? (
																<>
																	<Button
																		className="periscope-btn ghost"
																		icon={<PenLine size={14} />}
																		disabled={!!(activeAPIKey?.id === APIKey.id && activeSignal)}
																		onClick={(e): void => {
																			e.stopPropagation();
																			e.preventDefault();
																			enableEditLimitMode(APIKey, signal);
																		}}
																	/>

																	<Button
																		className="periscope-btn ghost"
																		icon={<Trash2 color={Color.BG_CHERRY_500} size={14} />}
																		disabled={!!(activeAPIKey?.id === APIKey.id && activeSignal)}
																		onClick={(e): void => {
																			e.stopPropagation();
																			e.preventDefault();

																			handleDeleteLimit(APIKey, limits[signal]);
																		}}
																	/>
																</>
															) : (
																<Button
																	className="periscope-btn"
																	size="small"
																	shape="round"
																	icon={<PlusIcon size={14} />}
																	disabled={!!(activeAPIKey?.id === APIKey.id && activeSignal)}
																	// eslint-disable-next-line sonarjs/no-identical-functions
																	onClick={(e): void => {
																		e.stopPropagation();
																		e.preventDefault();
																		enableEditLimitMode(APIKey, signal);
																	}}
																>
																	Limits
																</Button>
															)}
														</div>
													</div>

													<div className="signal-limit-values">
														{activeAPIKey?.id === APIKey.id && activeSignal === signal && (
															<Form
																name="edit-ingestion-key-limit-form"
																key="addEditLimitForm"
																form={addEditLimitForm}
																autoComplete="off"
																initialValues={{
																	dailyLimit: getFormattedLimit(
																		limits[signal]?.config?.day?.size,
																	),
																	secondsLimit: getFormattedLimit(
																		limits[signal]?.config?.second?.size,
																	),
																}}
																className="edit-ingestion-key-limit-form"
															>
																<div className="signal-limit-edit-mode">
																	<div className="daily-limit">
																		<div className="heading">
																			<div className="title"> Daily limit </div>
																			<div className="subtitle">
																				Add a limit for data ingested daily{' '}
																			</div>
																		</div>

																		<div className="size">
																			<Form.Item name="dailyLimit">
																				<Input
																					min={1}
																					type="number"
																					addonAfter={
																						<Select defaultValue="GB" disabled>
																							<Option value="TB">Terrabytes</Option>
																							<Option value="GB">Gigabytes</Option>
																							<Option value="MB">Megabytes</Option>
																							<Option value="KB">Kilobytes</Option>
																						</Select>
																					}
																				/>
																			</Form.Item>
																		</div>
																	</div>

																	<div className="second-limit">
																		<div className="heading">
																			<div className="title"> Per Second limit </div>
																			<div className="subtitle">
																				{' '}
																				Add a limit for data ingested every second{' '}
																			</div>
																		</div>

																		<div className="size">
																			<Form.Item name="secondsLimit">
																				<Input
																					min={1}
																					type="number"
																					addonAfter={
																						<Select defaultValue="GB" disabled>
																							<Option value="TB">Terrabytes</Option>
																							<Option value="GB">Gigabytes</Option>
																							<Option value="MB">Megabytes</Option>
																							<Option value="KB">Kilobytes</Option>
																						</Select>
																					}
																				/>
																			</Form.Item>
																		</div>
																	</div>
																</div>

																{activeAPIKey?.id === APIKey.id &&
																	activeSignal === signal &&
																	!isLoadingLimitForKey &&
																	hasCreateLimitForIngestionKeyError &&
																	createLimitForIngestionKeyError &&
																	createLimitForIngestionKeyError?.error && (
																		<div className="error">
																			{createLimitForIngestionKeyError?.error}
																		</div>
																	)}

																{activeAPIKey?.id === APIKey.id && activeSignal === signal && (
																	<div className="signal-limit-save-discard">
																		<Button
																			type="primary"
																			className="periscope-btn primary"
																			size="small"
																			disabled={isLoadingLimitForKey}
																			onClick={(): void => {
																				handleSaveLimit(
																					APIKey,
																					signal,
																					hasLimits(signal) ? 'update' : 'add',
																				);
																			}}
																		>
																			Save
																		</Button>
																		<Button
																			type="default"
																			className="periscope-btn"
																			size="small"
																			onClick={handleDiscardSaveLimit}
																		>
																			Discard
																		</Button>
																	</div>
																)}
															</Form>
														)}

														{(activeAPIKey?.id !== APIKey.id ||
															!activeSignal ||
															activeSignal !== signal) && (
															<div className="signal-limit-view-mode">
																<div className="signal-limit-value">
																	<div className="limit-type">
																		Daily <Minus size={16} />{' '}
																	</div>

																	<div className="limit-value">
																		{limits[signal]?.config?.day?.size ? (
																			<>
																				{getFormattedLimit(limits[signal]?.config?.day?.size)} GB
																			</>
																		) : (
																			<>
																				<Infinity size={16} /> NO LIMIT
																			</>
																		)}
																	</div>
																</div>

																<div className="signal-limit-value">
																	<div className="limit-type">
																		Seconds <Minus size={16} />
																	</div>

																	<div className="limit-value">
																		{limits[signal]?.config?.day?.size ? (
																			<>
																				{getFormattedLimit(limits[signal]?.config?.second?.size)} GB
																			</>
																		) : (
																			<>
																				<Infinity size={16} /> NO LIMIT
																			</>
																		)}
																	</div>
																</div>
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						),
					},
				];

				return (
					<div className="column-render">
						<Collapse items={items} />

						<div className="ingestion-key-details">
							<div className="ingestion-key-last-used-at">
								<CalendarClock size={14} />
								Expires on <Minus size={12} />
								<Typography.Text>{formattedDateAndTime}</Typography.Text>
							</div>
						</div>
					</div>
				);
			},
		},
	];

	return (
		<div className="ingestion-key-container">
			<div className="ingestion-key-content">
				<header>
					<Typography.Title className="title"> Ingestion Keys </Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage ingestion keys for the SigNoz Cloud
					</Typography.Text>
				</header>

				<div className="ingestion-keys-search-add-new">
					<Input
						placeholder="Search for ingestion key..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchValue}
						onChange={handleSearch}
					/>

					<Button
						className="add-new-ingestion-key-btn"
						type="primary"
						onClick={showAddModal}
					>
						<Plus size={14} /> New Ingestion key
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
							`${range[0]}-${range[1]} of ${total} Ingestion keys`,
					}}
				/>
			</div>

			{/* Delete Key Modal */}
			<Modal
				className="delete-ingestion-key-modal"
				title={<span className="title">Delete Ingestion Key</span>}
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
						Delete Ingestion Key
					</Button>,
				]}
			>
				<Typography.Text className="delete-text">
					{t('delete_confirm_message', {
						keyName: activeAPIKey?.name,
					})}
				</Typography.Text>
			</Modal>

			{/* Edit Modal */}
			<Modal
				className="ingestion-key-modal"
				title="Edit token"
				open={isEditModalOpen}
				key={`edit-ingestion-key-modal-${activeAPIKey}`}
				closable
				onCancel={hideEditViewModal}
				afterClose={handleModalClose}
				focusTriggerAfterClose
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
						Update Ingestion Key
					</Button>,
				]}
			>
				<Form
					name={`edit-ingestion-key-form-${activeAPIKey?.id}`}
					key={activeAPIKey?.id}
					form={editForm}
					layout="vertical"
					autoComplete="off"
					initialValues={{
						name: activeAPIKey?.name || '',
						tags: activeAPIKey?.tags || [],
						expires_at: dayjs(activeAPIKey?.expires_at) || null,
					}}
				>
					<Form.Item
						name="name"
						label="Name"
						rules={[{ required: true }, { type: 'string', min: 6 }]}
					>
						<Input placeholder="Enter Ingestion Key name" disabled />
					</Form.Item>

					<Form.Item name="tags" label="Tags">
						<Tags tags={updatedTags} setTags={setUpdatedTags} />
					</Form.Item>

					<Form.Item
						className="expires-at"
						name="expires_at"
						label="Expiration"
						rules={[{ required: true }]}
					>
						<DatePicker
							popupClassName="ingestion-key-expires-at"
							disabledDate={disabledDate}
						/>
					</Form.Item>
				</Form>
			</Modal>

			{/* Create New Key Modal */}
			<Modal
				className="ingestion-key-modal"
				title="Create new ingestion key"
				open={isAddModalOpen}
				key="create-ingestion-key-modal"
				closable
				onCancel={hideAddViewModal}
				destroyOnClose
				footer={[
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
						onClick={onCreateIngestionKey}
					>
						Create new Ingestion key
					</Button>,
				]}
			>
				<Form
					key="createForm"
					name="create-ingestion-key-form"
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
						rules={[
							{ required: true },
							{ type: 'string', min: 6 },
							{
								pattern: /^[a-zA-Z0-9_-]*$/,
								message:
									'Ingestion key name should only contain letters, numbers, underscores, and hyphens.',
							},
						]}
						validateTrigger="onBlur"
					>
						<Input placeholder="Enter Ingestion Key name" autoFocus />
					</Form.Item>

					<Form.Item
						className="expires-at"
						name="expires_at"
						label="Expiration"
						rules={[{ required: true }]}
					>
						<DatePicker
							popupClassName="ingestion-key-expires-at"
							disabledDate={disabledDate}
						/>
					</Form.Item>

					<Form.Item name="tags" label="Tags">
						<Tags tags={updatedTags} setTags={setUpdatedTags} />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}

export default IngestionSettings;
