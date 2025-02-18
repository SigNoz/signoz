import {
	DeleteOutlined,
	MoreOutlined,
	SaveOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import {
	Button,
	Col,
	Dropdown,
	MenuProps,
	Popover,
	Row,
	Select,
	Space,
	Typography,
} from 'antd';
import axios from 'axios';
import TextToolTip from 'components/TextToolTip';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import useErrorNotification from 'hooks/useErrorNotification';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { ExploreHeaderToolTip, SaveButtonText } from './constants';
import MenuItemGenerator from './MenuItemGenerator';
import SaveViewWithName from './SaveViewWithName';
import {
	DropDownOverlay,
	ExplorerCardHeadContainer,
	OffSetCol,
} from './styles';
import { ExplorerCardProps } from './types';
import { deleteViewHandler } from './utils';

function ExplorerCard({
	sourcepage,
	children,
}: ExplorerCardProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [, setCopyUrl] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const onCopyUrlHandler = (): void => {
		setCopyUrl(window.location.href);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
		isStagedQueryUpdated,
	} = useQueryBuilder();

	const {
		data: viewsData,
		isLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(sourcepage);

	useErrorNotification(error);

	const handleOpenChange = (newOpen = false): void => {
		setIsOpen(newOpen);
	};

	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';

	const viewKey = useGetSearchQueryParam(QueryParams.viewKey) || '';

	const { options } = useOptionsMenu({
		storageKey:
			sourcepage === DataSource.TRACES
				? LOCALSTORAGE.TRACES_LIST_OPTIONS
				: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: sourcepage,
		aggregateOperator: StringOperators.NOOP,
	});

	const isQueryUpdated = isStagedQueryUpdated(
		viewsData?.data?.data,
		viewKey,
		options,
	);

	const { mutateAsync: updateViewAsync } = useUpdateView({
		compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
		viewKey,
		extraData: '',
		sourcePage: sourcepage,
		viewName,
	});

	const { mutateAsync: deleteViewAsync } = useDeleteView(viewKey);

	const showErrorNotification = (err: Error): void => {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	};

	const onDeleteHandler = (): void =>
		deleteViewHandler({
			deleteViewAsync,
			notifications,
			panelType,
			redirectWithQueryBuilderData,
			refetchAllView,
			viewId: viewKey,
			viewKey,
			updateAllQueriesOperators,
			sourcePage: sourcepage,
		});

	const onUpdateQueryHandler = (): void => {
		updateViewAsync(
			{
				compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
				viewKey,
				extraData: '',
				sourcePage: sourcepage,
				viewName,
			},
			{
				onSuccess: () => {
					notifications.success({
						message: 'View Updated Successfully',
					});
					refetchAllView();
				},
				onError: (err) => {
					showErrorNotification(err);
				},
			},
		);
	};

	const moreOptionMenu: MenuProps = {
		items: [
			{
				key: 'delete',
				label: <Typography.Text strong>Delete</Typography.Text>,
				onClick: onDeleteHandler,
				icon: <DeleteOutlined />,
			},
		],
	};

	const saveButtonType = isQueryUpdated ? 'default' : 'primary';
	const saveButtonIcon = isQueryUpdated ? null : <SaveOutlined />;

	const showSaveView = false;

	return (
		<>
			{showSaveView && (
				<ExplorerCardHeadContainer size="small">
					<Row align="middle">
						<Col span={6}>
							<Space>
								<Typography>Query Builder</Typography>
								<TextToolTip
									url={ExploreHeaderToolTip.url}
									text={ExploreHeaderToolTip.text}
									useFilledIcon={false}
								/>
							</Space>
						</Col>
						<OffSetCol span={18}>
							<Space size="large">
								{viewsData?.data.data && viewsData?.data.data.length && (
									<Space>
										<Select
											getPopupContainer={popupContainer}
											loading={isLoading || isRefetching}
											showSearch
											placeholder="Select a view"
											dropdownStyle={DropDownOverlay}
											dropdownMatchSelectWidth={false}
											optionLabelProp="value"
											value={viewName || undefined}
										>
											{viewsData?.data.data.map((view) => (
												<Select.Option key={view.uuid} value={view.name}>
													<MenuItemGenerator
														viewName={view.name}
														viewKey={viewKey}
														createdBy={view.createdBy}
														uuid={view.uuid}
														refetchAllView={refetchAllView}
														viewData={viewsData.data.data}
														sourcePage={sourcepage}
													/>
												</Select.Option>
											))}
										</Select>
									</Space>
								)}
								{isQueryUpdated && (
									<Button
										type="primary"
										icon={<SaveOutlined />}
										onClick={onUpdateQueryHandler}
									>
										Save changes
									</Button>
								)}
								<Popover
									getPopupContainer={popupContainer}
									placement="bottomLeft"
									trigger="click"
									content={
										<SaveViewWithName
											sourcePage={sourcepage}
											handlePopOverClose={handleOpenChange}
											refetchAllView={refetchAllView}
										/>
									}
									showArrow={false}
									open={isOpen}
									onOpenChange={handleOpenChange}
								>
									<Button
										type={saveButtonType}
										icon={saveButtonIcon}
										data-testid="traces-save-view-action"
									>
										{isQueryUpdated
											? SaveButtonText.SAVE_AS_NEW_VIEW
											: SaveButtonText.SAVE_VIEW}
									</Button>
								</Popover>
								<ShareAltOutlined onClick={onCopyUrlHandler} />
								{viewKey && (
									<Dropdown trigger={['click']} menu={moreOptionMenu}>
										<MoreOutlined />
									</Dropdown>
								)}
							</Space>
						</OffSetCol>
					</Row>
				</ExplorerCardHeadContainer>
			)}

			<div>{children}</div>
		</>
	);
}

export default ExplorerCard;
