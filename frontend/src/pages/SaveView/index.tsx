import './SaveView.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	ColorPicker,
	Input,
	Modal,
	Table,
	TableProps,
	Typography,
} from 'antd';
import logEvent from 'api/common/logEvent';
import {
	getViewDetailsUsingViewKey,
	showErrorNotification,
} from 'components/ExplorerCard/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getRandomColor } from 'container/ExplorerOptions/utils';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import useErrorNotification from 'hooks/useErrorNotification';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import {
	CalendarClock,
	Check,
	Compass,
	PenLine,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';
import { USER_ROLES } from 'types/roles';

import { ROUTES_VS_SOURCEPAGE, SOURCEPAGE_VS_ROUTES } from './constants';
import { deleteViewHandler } from './utils';

const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.AUTHOR, USER_ROLES.EDITOR];

function SaveView(): JSX.Element {
	const { pathname } = useLocation();
	const sourcepage = ROUTES_VS_SOURCEPAGE[pathname];
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [activeViewKey, setActiveViewKey] = useState<string>('');
	const [newViewName, setNewViewName] = useState<string>('');
	const [color, setColor] = useState(Color.BG_SIENNA_500);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [activeViewName, setActiveViewName] = useState<string>('');
	const [
		activeCompositeQuery,
		setActiveCompositeQuery,
	] = useState<ICompositeMetricQuery | null>(null);
	const [searchValue, setSearchValue] = useState<string>('');
	const [dataSource, setDataSource] = useState<ViewProps[]>([]);
	const { t } = useTranslation(['explorer']);

	const hideDeleteViewModal = (): void => {
		setIsDeleteModalOpen(false);
	};

	const { user } = useAppContext();

	const handleDeleteModelOpen = (uuid: string, name: string): void => {
		setActiveViewKey(uuid);
		setActiveViewName(name);
		setIsDeleteModalOpen(true);
	};

	const hideEditViewModal = (): void => {
		setIsEditModalOpen(false);
	};

	const handleEditModelOpen = (view: ViewProps, color: string): void => {
		setActiveViewKey(view.uuid);
		setColor(color);
		setActiveViewName(view.name);
		setNewViewName(view.name);
		setActiveCompositeQuery(view.compositeQuery);
		setIsEditModalOpen(true);
	};

	const { notifications } = useNotifications();

	const {
		data: viewsData,
		isLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(sourcepage as DataSource);

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

	const {
		mutateAsync: deleteViewAsync,
		isLoading: isDeleteLoading,
	} = useDeleteView(activeViewKey);

	const onDeleteHandler = (): void => {
		deleteViewHandler({
			deleteViewAsync,
			notifications,
			refetchAllView,
			viewId: activeViewKey,
			hideDeleteViewModal,
			clearSearch,
		});
	};

	const {
		mutateAsync: updateViewAsync,
		isLoading: isViewUpdating,
	} = useUpdateView({
		compositeQuery: activeCompositeQuery || ({} as ICompositeMetricQuery),
		viewKey: activeViewKey,
		extraData: JSON.stringify({ color }),
		sourcePage: sourcepage || DataSource.LOGS,
		viewName: newViewName,
	});

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isLoading) {
			if (sourcepage === DataSource.TRACES) {
				logEvent('Traces Views: Views visited', {
					number: viewsData?.data?.data?.length,
				});
			} else if (sourcepage === DataSource.LOGS) {
				logEvent('Logs Views: Views visited', {
					number: viewsData?.data?.data?.length,
				});
			}
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewsData?.data.data, isLoading]);
	const onUpdateQueryHandler = (): void => {
		updateViewAsync(
			{
				compositeQuery: activeCompositeQuery || ({} as ICompositeMetricQuery),
				viewKey: activeViewKey,
				extraData: JSON.stringify({ color }),
				sourcePage: sourcepage,
				viewName: activeViewName,
			},
			{
				onSuccess: () => {
					notifications.success({
						message: 'View Updated Successfully',
					});
					hideEditViewModal();
					refetchAllView();
				},
				onError: (err) => {
					showErrorNotification(notifications, err);
				},
			},
		);
	};

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const handleRedirectQuery = (view: ViewProps): void => {
		const currentViewDetails = getViewDetailsUsingViewKey(
			view.uuid,
			viewsData?.data.data,
		);
		if (!currentViewDetails) return;
		const { query, name, uuid, panelType: currentPanelType } = currentViewDetails;

		if (sourcepage) {
			handleExplorerTabChange(
				currentPanelType,
				{
					query,
					name,
					uuid,
				},
				SOURCEPAGE_VS_ROUTES[sourcepage],
			);
		}
	};

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns: TableProps<ViewProps>['columns'] = [
		{
			title: 'Save View',
			key: 'view',
			render: (view: ViewProps): JSX.Element => {
				const extraData = view.extraData !== '' ? JSON.parse(view.extraData) : '';
				let bgColor = getRandomColor();
				if (extraData !== '') {
					bgColor = extraData.color;
				}

				const formattedDateAndTime = formatTimezoneAdjustedTimestamp(
					view.createdAt,
					DATE_TIME_FORMATS.DASH_TIME_DATE,
				);

				const isEditDeleteSupported = allowedRoles.includes(user.role as string);

				return (
					<div className="column-render">
						<div className="title-with-action">
							<div className="save-view-title">
								<span
									className="dot"
									style={{
										background: bgColor,
										boxShadow: `0px 0px 6px 0px ${bgColor}`,
									}}
								/>{' '}
								<Typography.Text>{view.name}</Typography.Text>
							</div>

							<div className="action-btn">
								<PenLine
									size={14}
									className={isEditDeleteSupported ? '' : 'hidden'}
									data-testid="edit-view"
									onClick={(): void => handleEditModelOpen(view, bgColor)}
								/>
								<Compass
									size={14}
									onClick={(): void => handleRedirectQuery(view)}
									data-testid="go-to-explorer"
								/>
								<Trash2
									size={14}
									className={isEditDeleteSupported ? '' : 'hidden'}
									color={Color.BG_CHERRY_500}
									data-testid="delete-view"
									onClick={(): void => handleDeleteModelOpen(view.uuid, view.name)}
								/>
							</div>
						</div>
						<div className="view-details">
							<div className="view-tag">
								<Typography.Text className="tag-text">
									{view.createdBy.substring(0, 1).toUpperCase()}
								</Typography.Text>
							</div>
							<Typography.Text className="view-created-by">
								{view.createdBy}
							</Typography.Text>
							<div className="view-created-at">
								<CalendarClock size={14} />
								<Typography.Text>{formattedDateAndTime}</Typography.Text>
							</div>
						</div>
					</div>
				);
			},
		},
	];

	const paginationConfig = { pageSize: 5, hideOnSinglePage: true };

	return (
		<div className="save-view-container">
			<div className="save-view-content">
				<Typography.Title className="title">Views</Typography.Title>
				<Typography.Text className="subtitle">
					Manage your saved views for {ROUTES_VS_SOURCEPAGE[pathname]}.{' '}
					<Typography.Link
						className="learn-more"
						href="https://signoz.io/docs/product-features/saved-view/?utm_source=product&utm_medium=views-tab"
						target="_blank"
					>
						Learn more
					</Typography.Link>
				</Typography.Text>
				<Input
					placeholder="Search for views..."
					prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
					value={searchValue}
					onChange={handleSearch}
				/>

				<Table
					columns={columns}
					dataSource={dataSource}
					loading={isLoading || isRefetching}
					showHeader={false}
					pagination={paginationConfig}
				/>
			</div>

			<Modal
				className="delete-view-modal"
				title={<span className="title">Delete view</span>}
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
						disabled={isDeleteLoading}
						data-testid="confirm-delete"
					>
						Delete view
					</Button>,
				]}
			>
				<Typography.Text className="delete-text">
					{t('delete_confirm_message', {
						viewName: activeViewName,
					})}
				</Typography.Text>
			</Modal>

			<Modal
				className="save-view-modal"
				title={<span className="title">Edit view details</span>}
				open={isEditModalOpen}
				closable={false}
				onCancel={hideEditViewModal}
				footer={[
					<Button
						key="submit"
						icon={<Check size={16} color={Color.BG_VANILLA_100} />}
						onClick={onUpdateQueryHandler}
						disabled={isViewUpdating}
						data-testid="save-view"
					>
						Save changes
					</Button>,
				]}
			>
				<Typography.Text>Label</Typography.Text>
				<div className="save-view-input">
					<ColorPicker
						value={color}
						onChange={(value, hex): void => setColor(hex)}
					/>
					<Input
						placeholder="e.g. Crash landing view"
						value={newViewName}
						data-testid="view-name"
						onChange={(e): void => setNewViewName(e.target.value)}
					/>
				</div>
			</Modal>
		</div>
	);
}

export default SaveView;
