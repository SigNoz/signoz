import './APIKeys.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	Radio,
	Table,
	TableProps,
	Typography,
} from 'antd';
import cx from 'classnames';
import { getRandomColor } from 'container/ExplorerOptions/utils';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import useErrorNotification from 'hooks/useErrorNotification';
import {
	CalendarClock,
	Check,
	ClipboardEdit,
	Contact2,
	Copy,
	Eye,
	PenLine,
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';
import { USER_ROLES } from 'types/roles';

function APIKeys(): JSX.Element {
	const sourcepage = 'traces';
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [activeViewKey, setActiveViewKey] = useState<string>('');
	const [newViewName, setNewViewName] = useState<string>('');
	const [color, setColor] = useState(Color.BG_SIENNA_500);

	const [isAddModalOpen, setIsAddModalOpen] = useState(false);

	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [activeViewName, setActiveViewName] = useState<string>('');
	const [
		activeCompositeQuery,
		setActiveCompositeQuery,
	] = useState<ICompositeMetricQuery | null>(null);
	const [searchValue, setSearchValue] = useState<string>('');
	const [dataSource, setDataSource] = useState<ViewProps[]>([]);
	const { t } = useTranslation(['apiKeys']);

	const [form] = Form.useForm();

	const hideDeleteViewModal = (): void => {
		setIsDeleteModalOpen(false);
	};

	const handleDeleteModelOpen = (uuid: string, name: string): void => {
		setActiveViewKey(uuid);
		setActiveViewName(name);
		setIsDeleteModalOpen(true);
	};

	const hideEditViewModal = (): void => {
		setIsEditModalOpen(false);
	};

	const hideAddViewModal = (): void => {
		setIsAddModalOpen(false);
	};

	const handleEditModelOpen = (view: ViewProps, color: string): void => {
		setActiveViewKey(view.uuid);
		setColor(color);
		setActiveViewName(view.name);
		setNewViewName(view.name);
		setActiveCompositeQuery(view.compositeQuery);
		setIsEditModalOpen(true);
	};

	const handleAddModelOpen = (): void => {
		setIsAddModalOpen(true);
	};

	const { data: viewsData, isLoading, error, isRefetching } = useGetAllViews(
		sourcepage as DataSource,
	);

	useEffect(() => {
		setDataSource(viewsData?.data.data || []);
	}, [viewsData?.data.data]);

	useErrorNotification(error);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		const filteredData = viewsData?.data.data.filter((view) =>
			view.name.toLowerCase().includes(e.target.value.toLowerCase()),
		);
		setDataSource(filteredData || []);
	};

	const clearSearch = (): void => {
		setSearchValue('');
	};

	const onDeleteHandler = (): void => {
		console.log('on delete handler');
		clearSearch();
	};

	const onUpdateApiKey = (): void => {
		console.log('update key');
	};

	const columns: TableProps<ViewProps>['columns'] = [
		{
			title: 'API Key',
			key: 'api-key',
			render: (view: ViewProps): JSX.Element => {
				const extraData = view.extraData !== '' ? JSON.parse(view.extraData) : '';
				let bgColor = getRandomColor();
				if (extraData !== '') {
					bgColor = extraData.color;
				}

				const timeOptions: Intl.DateTimeFormatOptions = {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false,
				};
				const formattedTime = new Date(view.createdAt).toLocaleTimeString(
					'en-US',
					timeOptions,
				);

				const dateOptions: Intl.DateTimeFormatOptions = {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				};

				const formattedDate = new Date(view.createdAt).toLocaleDateString(
					'en-US',
					dateOptions,
				);

				// Combine time and date
				const formattedDateAndTime = `${formattedDate} ${formattedTime} `;
				return (
					<div className="column-render">
						<div className="title-with-action">
							<div className="api-key-data">
								<div className="api-key-title">
									<Typography.Text>{view.name}</Typography.Text>
								</div>

								<div className="api-key-value">
									<Typography.Text>
										{view.name.substring(0, 2)}********
										{view.name.substring(view.name.length - 2).trim()}
									</Typography.Text>

									<Copy className="copy-key-btn" size={12} />
								</div>

								<Button
									size="small"
									className="periscope-btn primary visibility-btn"
									shape="circle"
									icon={<Eye size={12} color={Color.BG_ROBIN_400} />}
								/>
							</div>

							<div className="action-btn">
								<PenLine
									size={14}
									onClick={(): void => handleEditModelOpen(view, bgColor)}
								/>

								<Trash2
									size={14}
									color={Color.BG_CHERRY_500}
									onClick={(): void => handleDeleteModelOpen(view.uuid, view.name)}
								/>
							</div>
						</div>

						<div className="api-key-details">
							<div className="api-key-created-at">
								<CalendarClock size={14} />
								Last used
								<Typography.Text>{formattedDateAndTime}</Typography.Text>
							</div>
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
						onClick={handleAddModelOpen}
					>
						{' '}
						<Plus size={14} /> New Key{' '}
					</Button>
				</div>

				<Table
					columns={columns}
					dataSource={dataSource}
					loading={isLoading || isRefetching}
					showHeader={false}
					pagination={{ pageSize: 5 }}
				/>
			</div>

			<Modal
				className="delete-api-key-modal"
				title={<span className="title">Delete key</span>}
				open={isDeleteModalOpen}
				closable={false}
				onCancel={hideDeleteViewModal}
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
						onClick={onDeleteHandler}
						className="delete-btn"
					>
						Delete key
					</Button>,
				]}
			>
				<Typography.Text className="delete-text">
					{t('delete_confirm_message', {
						keyName: activeViewName,
					})}
				</Typography.Text>
			</Modal>

			<Modal
				className="api-key-modal"
				title="Edit key"
				open={isEditModalOpen}
				closable
				onCancel={hideEditViewModal}
				footer={[
					<Button
						className="periscope-btn primary"
						key="submit"
						type="primary"
						icon={<Check size={14} />}
						onClick={onUpdateApiKey}
					>
						Update key
					</Button>,
				]}
			>
				<Form form={form} layout="vertical" autoComplete="off">
					<Form.Item
						name="label"
						label="Label"
						rules={[
							{ required: true },
							{ type: 'url', warningOnly: true },
							{ type: 'string', min: 6 },
						]}
					>
						<Input placeholder="Top Secret" />
					</Form.Item>

					<Form.Item name="role" label="Role">
						<Flex vertical gap="middle">
							<Radio.Group buttonStyle="solid" className="api-key-access-role">
								<Radio.Button value={USER_ROLES.ADMIN} className="tab">
									<div className="role">
										<Contact2 size={14} /> Admin
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.EDITOR} className="tab selected">
									<div className="role">
										{' '}
										<ClipboardEdit size={14} /> Editor
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.EDITOR} className="tab">
									<div className="role">
										{' '}
										<Eye size={14} /> Viewer
									</div>
								</Radio.Button>
							</Radio.Group>
						</Flex>
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				className="api-key-modal"
				title="Create new key"
				open={isAddModalOpen}
				closable
				onCancel={hideAddViewModal}
				footer={[
					<Button
						className="periscope-btn primary"
						key="submit"
						type="primary"
						icon={<Check size={14} />}
						onClick={onUpdateApiKey}
					>
						Create new key
					</Button>,
				]}
			>
				<Form
					form={form}
					initialValues={{
						role: USER_ROLES.ADMIN,
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

					<Form.Item name="role" label="Role">
						<Flex vertical gap="middle">
							<Radio.Group buttonStyle="solid" className="api-key-access-role">
								<Radio.Button
									value={USER_ROLES.ADMIN}
									className={cx(
										'tab',
										form.getFieldValue('role') === USER_ROLES.ADMIN ? 'selected' : '',
									)}
								>
									<div className="role">
										<Contact2 size={14} /> Admin
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.VIEWER} className="tab">
									<div className="role">
										{' '}
										<ClipboardEdit size={14} /> Editor
									</div>
								</Radio.Button>
								<Radio.Button value={USER_ROLES.EDITOR} className="tab">
									<div className="role">
										{' '}
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
						<InputNumber min={1} max={100} defaultValue={30} />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}

export default APIKeys;
