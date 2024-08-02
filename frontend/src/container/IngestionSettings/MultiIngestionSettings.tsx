import './IngestionSettings.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Col,
	Collapse,
	DatePicker,
	Form,
	Input,
	InputNumber,
	Modal,
	Row,
	Select,
	Table,
	TablePaginationConfig,
	TableProps as AntDTableProps,
	Tag,
	Typography,
} from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { CollapseProps } from 'antd/lib';
import createIngestionKeyApi from 'api/IngestionKeys/createIngestionKey';
import deleteIngestionKey from 'api/IngestionKeys/deleteIngestionKey';
import createLimitForIngestionKeyApi from 'api/IngestionKeys/limits/createLimitsForKey';
import deleteLimitsForIngestionKey from 'api/IngestionKeys/limits/deleteLimitsForIngestionKey';
import updateLimitForIngestionKeyApi from 'api/IngestionKeys/limits/updateLimitsForIngestionKey';
import updateIngestionKey from 'api/IngestionKeys/updateIngestionKey';
import { AxiosError } from 'axios';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import Tags from 'components/Tags/Tags';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import dayjs, { Dayjs } from 'dayjs';
import { useGetAllIngestionsKeys } from 'hooks/IngestionKeys/useGetAllIngestionKeys';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import { isNil } from 'lodash-es';
import {
	ArrowUpRight,
	CalendarClock,
	Check,
	Copy,
	Infinity,
	Info,
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
import { ErrorResponse } from 'types/api';
import { LimitProps } from 'types/api/ingestionKeys/limits/types';
import {
	IngestionKeyProps,
	PaginationProps,
} from 'types/api/ingestionKeys/types';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

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

function MultiIngestionSettings(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const { notifications } = useNotifications();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isDeleteLimitModalOpen, setIsDeleteLimitModalOpen] = useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [, handleCopyToClipboard] = useCopyToClipboard();
	const [updatedTags, setUpdatedTags] = useState<string[]>([]);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isEditAddLimitOpen, setIsEditAddLimitOpen] = useState(false);
	const [activeAPIKey, setActiveAPIKey] = useState<IngestionKeyProps | null>();
	const [activeSignal, setActiveSignal] = useState<LimitProps | null>(null);

	const [searchValue, setSearchValue] = useState<string>('');
	const [searchText, setSearchText] = useState<string>('');
	const [dataSource, setDataSource] = useState<IngestionKeyProps[]>([]);
	const [paginationParams, setPaginationParams] = useState<PaginationProps>({
		page: 1,
		per_page: 10,
	});

	const [totalIngestionKeys, setTotalIngestionKeys] = useState(0);

	const [
		hasCreateLimitForIngestionKeyError,
		setHasCreateLimitForIngestionKeyError,
	] = useState(false);

	const [
		createLimitForIngestionKeyError,
		setCreateLimitForIngestionKeyError,
	] = useState<ErrorResponse | null>(null);

	const [
		hasUpdateLimitForIngestionKeyError,
		setHasUpdateLimitForIngestionKeyError,
	] = useState(false);

	const [
		updateLimitForIngestionKeyError,
		setUpdateLimitForIngestionKeyError,
	] = useState<ErrorResponse | null>(null);

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
		setIsDeleteModalOpen(false);
		setActiveAPIKey(null);
		handleFormReset();
	};

	const showDeleteModal = (apiKey: IngestionKeyProps): void => {
		setActiveAPIKey(apiKey);
		setIsDeleteModalOpen(true);
	};

	const hideEditViewModal = (): void => {
		setActiveAPIKey(null);
		setIsEditModalOpen(false);
		handleFormReset();
	};

	const hideAddViewModal = (): void => {
		handleFormReset();
		setActiveAPIKey(null);
		setIsAddModalOpen(false);
	};

	const showEditModal = (apiKey: IngestionKeyProps): void => {
		setActiveAPIKey(apiKey);

		handleFormReset();
		setUpdatedTags(apiKey.tags || []);

		editForm.setFieldsValue({
			name: apiKey.name,
			tags: apiKey.tags,
			expires_at: dayjs(apiKey?.expires_at) || null,
		});

		setIsEditModalOpen(true);
	};

	const showAddModal = (): void => {
		setUpdatedTags([]);
		setActiveAPIKey(null);
		setIsAddModalOpen(true);
	};

	const handleModalClose = (): void => {
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
	} = useGetAllIngestionsKeys({
		search: searchText,
		...paginationParams,
	});

	useEffect(() => {
		setActiveAPIKey(IngestionKeys?.data.data[0]);
	}, [IngestionKeys]);

	useEffect(() => {
		setDataSource(IngestionKeys?.data.data || []);
		setTotalIngestionKeys(IngestionKeys?.data?._pagination?.total || 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [IngestionKeys?.data?.data]);

	useEffect(() => {
		if (isError) {
			showErrorNotification(notifications, error as AxiosError);
		}
	}, [error, isError, notifications]);

	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		handleDebouncedSearch(e.target.value || '');
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
	} = useMutation(createLimitForIngestionKeyApi, {
		onSuccess: () => {
			setActiveSignal(null);
			setActiveAPIKey(null);
			setIsEditAddLimitOpen(false);
			setUpdatedTags([]);
			hideAddViewModal();
			refetchAPIKeys();
			setHasCreateLimitForIngestionKeyError(false);
		},
		onError: (error: ErrorResponse) => {
			setHasCreateLimitForIngestionKeyError(true);
			setCreateLimitForIngestionKeyError(error);
		},
	});

	const {
		mutate: updateLimitForIngestionKey,
		isLoading: isLoadingUpdatedLimitForKey,
	} = useMutation(updateLimitForIngestionKeyApi, {
		onSuccess: () => {
			setActiveSignal(null);
			setActiveAPIKey(null);
			setIsEditAddLimitOpen(false);
			setUpdatedTags([]);
			hideAddViewModal();
			refetchAPIKeys();
			setHasUpdateLimitForIngestionKeyError(false);
		},
		onError: (error: ErrorResponse) => {
			setHasUpdateLimitForIngestionKeyError(true);
			setUpdateLimitForIngestionKeyError(error);
		},
	});

	const { mutate: deleteLimitForKey, isLoading: isDeletingLimit } = useMutation(
		deleteLimitsForIngestionKey,
		{
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				setIsDeleteLimitModalOpen(false);
				refetchAPIKeys();
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
							expires_at: dayjs(values.expires_at).endOf('day').toISOString(),
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

	const gbToBytes = (gb: number): number => Math.round(gb * 1024 ** 3);

	const getFormattedTime = (date: string): string =>
		dayjs(date).format('MMM DD,YYYY, hh:mm a');

	const handleAddLimit = (
		APIKey: IngestionKeyProps,
		signalName: string,
	): void => {
		setActiveSignal({
			id: signalName,
			signal: signalName,
			config: {},
		});

		const { dailyLimit, secondsLimit } = addEditLimitForm.getFieldsValue();

		const payload = {
			keyID: APIKey.id,
			signal: signalName,
			config: {
				day: {
					size: gbToBytes(dailyLimit),
				},
				second: {
					size: gbToBytes(secondsLimit),
				},
			},
		};

		createLimitForIngestionKey(payload);
	};

	const handleUpdateLimit = (
		APIKey: IngestionKeyProps,
		signal: LimitProps,
	): void => {
		setActiveSignal(signal);
		const { dailyLimit, secondsLimit } = addEditLimitForm.getFieldsValue();
		const payload = {
			limitID: signal.id,
			signal: signal.signal,
			config: {
				day: {
					size: gbToBytes(dailyLimit),
				},
				second: {
					size: gbToBytes(secondsLimit),
				},
			},
		};
		updateLimitForIngestionKey(payload);
	};

	const bytesToGb = (size: number | undefined): number => {
		if (!size) {
			return 0;
		}

		return size / BYTES;
	};

	const enableEditLimitMode = (
		APIKey: IngestionKeyProps,
		signal: LimitProps,
	): void => {
		setActiveAPIKey(APIKey);
		setActiveSignal(signal);

		addEditLimitForm.setFieldsValue({
			dailyLimit: bytesToGb(signal?.config?.day?.size || 0),
			secondsLimit: bytesToGb(signal?.config?.second?.size || 0),
		});

		setIsEditAddLimitOpen(true);
	};

	const onDeleteLimitHandler = (): void => {
		if (activeSignal && activeSignal?.id) {
			deleteLimitForKey(activeSignal.id);
		}
	};

	const showDeleteLimitModal = (
		APIKey: IngestionKeyProps,
		limit: LimitProps,
	): void => {
		setActiveAPIKey(APIKey);
		setActiveSignal(limit);
		setIsDeleteLimitModalOpen(true);
	};

	const hideDeleteLimitModal = (): void => {
		setIsDeleteLimitModalOpen(false);
	};

	const handleDiscardSaveLimit = (): void => {
		setHasCreateLimitForIngestionKeyError(false);
		setHasUpdateLimitForIngestionKeyError(false);
		setIsEditAddLimitOpen(false);
		setActiveAPIKey(null);
		setActiveSignal(null);

		addEditLimitForm.resetFields();
	};

	const columns: AntDTableProps<IngestionKeyProps>['columns'] = [
		{
			title: 'Ingestion Key',
			key: 'ingestion-key',
			// eslint-disable-next-line sonarjs/cognitive-complexity
			render: (APIKey: IngestionKeyProps): JSX.Element => {
				const createdOn = getFormattedTime(APIKey.created_at);
				const formattedDateAndTime =
					APIKey && APIKey?.expires_at && getFormattedTime(APIKey?.expires_at);

				const updatedOn = getFormattedTime(APIKey?.updated_at);

				const limits: { [key: string]: LimitProps } = {};

				APIKey.limits?.forEach((limit: LimitProps) => {
					limits[limit.signal] = limit;
				});

				const hasLimits = (signal: string): boolean => !!limits[signal];

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
											{SIGNALS.map((signal) => {
												const hasValidDayLimit = !isNil(limits[signal]?.config?.day?.size);
												const hasValidSecondLimit = !isNil(
													limits[signal]?.config?.second?.size,
												);

												return (
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
																				enableEditLimitMode(APIKey, limits[signal]);
																			}}
																		/>

																		<Button
																			className="periscope-btn ghost"
																			icon={<Trash2 color={Color.BG_CHERRY_500} size={14} />}
																			disabled={!!(activeAPIKey?.id === APIKey.id && activeSignal)}
																			onClick={(e): void => {
																				e.stopPropagation();
																				e.preventDefault();
																				showDeleteLimitModal(APIKey, limits[signal]);
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

																			enableEditLimitMode(APIKey, {
																				id: signal,
																				signal,
																				config: {},
																			});
																		}}
																	>
																		Limits
																	</Button>
																)}
															</div>
														</div>

														<div className="signal-limit-values">
															{activeAPIKey?.id === APIKey.id &&
															activeSignal?.signal === signal &&
															isEditAddLimitOpen ? (
																<Form
																	name="edit-ingestion-key-limit-form"
																	key="addEditLimitForm"
																	form={addEditLimitForm}
																	autoComplete="off"
																	initialValues={{
																		dailyLimit: bytesToGb(limits[signal]?.config?.day?.size),
																		secondsLimit: bytesToGb(limits[signal]?.config?.second?.size),
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
																					<InputNumber
																						addonAfter={
																							<Select defaultValue="GiB" disabled>
																								<Option value="TiB"> TiB</Option>
																								<Option value="GiB"> GiB</Option>
																								<Option value="MiB"> MiB </Option>
																								<Option value="KiB"> KiB </Option>
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
																					<InputNumber
																						addonAfter={
																							<Select defaultValue="GiB" disabled>
																								<Option value="TiB"> TiB</Option>
																								<Option value="GiB"> GiB</Option>
																								<Option value="MiB"> MiB </Option>
																								<Option value="KiB"> KiB </Option>
																							</Select>
																						}
																					/>
																				</Form.Item>
																			</div>
																		</div>
																	</div>

																	{activeAPIKey?.id === APIKey.id &&
																		activeSignal.signal === signal &&
																		!isLoadingLimitForKey &&
																		hasCreateLimitForIngestionKeyError &&
																		createLimitForIngestionKeyError &&
																		createLimitForIngestionKeyError?.error && (
																			<div className="error">
																				{createLimitForIngestionKeyError?.error}
																			</div>
																		)}

																	{activeAPIKey?.id === APIKey.id &&
																		activeSignal.signal === signal &&
																		!isLoadingLimitForKey &&
																		hasUpdateLimitForIngestionKeyError &&
																		updateLimitForIngestionKeyError && (
																			<div className="error">
																				{updateLimitForIngestionKeyError?.error}
																			</div>
																		)}

																	{activeAPIKey?.id === APIKey.id &&
																		activeSignal.signal === signal &&
																		isEditAddLimitOpen && (
																			<div className="signal-limit-save-discard">
																				<Button
																					type="primary"
																					className="periscope-btn primary"
																					size="small"
																					disabled={
																						isLoadingLimitForKey || isLoadingUpdatedLimitForKey
																					}
																					loading={
																						isLoadingLimitForKey || isLoadingUpdatedLimitForKey
																					}
																					onClick={(): void => {
																						if (!hasLimits(signal)) {
																							handleAddLimit(APIKey, signal);
																						} else {
																							handleUpdateLimit(APIKey, limits[signal]);
																						}
																					}}
																				>
																					Save
																				</Button>
																				<Button
																					type="default"
																					className="periscope-btn"
																					size="small"
																					disabled={
																						isLoadingLimitForKey || isLoadingUpdatedLimitForKey
																					}
																					onClick={handleDiscardSaveLimit}
																				>
																					Discard
																				</Button>
																			</div>
																		)}
																</Form>
															) : (
																<div className="signal-limit-view-mode">
																	<div className="signal-limit-value">
																		<div className="limit-type">
																			Daily <Minus size={16} />{' '}
																		</div>

																		<div className="limit-value">
																			{hasValidDayLimit ? (
																				<>
																					{getYAxisFormattedValue(
																						(limits[signal]?.metric?.day?.size || 0).toString(),
																						'bytes',
																					)}{' '}
																					/{' '}
																					{getYAxisFormattedValue(
																						(limits[signal]?.config?.day?.size || 0).toString(),
																						'bytes',
																					)}
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
																			{hasValidSecondLimit ? (
																				<>
																					{getYAxisFormattedValue(
																						(limits[signal]?.metric?.second?.size || 0).toString(),
																						'bytes',
																					)}{' '}
																					/{' '}
																					{getYAxisFormattedValue(
																						(limits[signal]?.config?.second?.size || 0).toString(),
																						'bytes',
																					)}
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
												);
											})}
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

	const handleTableChange = (pagination: TablePaginationConfig): void => {
		setPaginationParams({
			page: pagination?.current || 1,
			per_page: 10,
		});
	};

	return (
		<div className="ingestion-key-container">
			<div className="ingestion-key-content">
				<div className="ingestion-setup-details-links">
					<Info size={14} />

					<span>
						Find your ingestion URL and learn more about sending data to SigNoz{' '}
						<a
							href="https://signoz.io/docs/ingestion/signoz-cloud/overview/"
							target="_blank"
							className="learn-more"
							rel="noreferrer"
						>
							here <ArrowUpRight size={14} />
						</a>
					</span>
				</div>

				<header>
					<Typography.Title className="title"> Ingestion Keys </Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage ingestion keys for the SigNoz Cloud{' '}
						<a
							href="https://signoz.io/docs/ingestion/signoz-cloud/keys/"
							target="_blank"
							className="learn-more"
							rel="noreferrer"
						>
							{' '}
							Learn more <ArrowUpRight size={14} />
						</a>
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
					onChange={handleTableChange}
					pagination={{
						pageSize: paginationParams?.per_page,
						hideOnSinglePage: true,
						showTotal: (total: number, range: number[]): string =>
							`${range[0]}-${range[1]} of ${total} Ingestion keys`,
						total: totalIngestionKeys,
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

			{/* Delete Limit Modal */}
			<Modal
				className="delete-ingestion-key-modal"
				title={<span className="title">Delete Limit </span>}
				open={isDeleteLimitModalOpen}
				closable
				afterClose={handleModalClose}
				onCancel={hideDeleteLimitModal}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={hideDeleteLimitModal}
						className="cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						icon={<Trash2 size={16} />}
						loading={isDeletingLimit}
						onClick={onDeleteLimitHandler}
						className="delete-btn"
					>
						Delete Limit
					</Button>,
				]}
			>
				<Typography.Text className="delete-text">
					{t('delete_limit_confirm_message', {
						limit_name: activeSignal?.signal,
						keyName: activeAPIKey?.name,
					})}
				</Typography.Text>
			</Modal>

			{/* Edit Modal */}
			<Modal
				className="ingestion-key-modal"
				title="Edit Ingestion Key"
				open={isEditModalOpen}
				key="edit-ingestion-key-modal"
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

export default MultiIngestionSettings;
