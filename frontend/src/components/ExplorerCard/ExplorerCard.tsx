import {
	DeleteOutlined,
	DownOutlined,
	MoreOutlined,
	SaveOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import {
	Button,
	Card,
	Col,
	Dropdown,
	MenuProps,
	Popover,
	Row,
	Space,
	Typography,
} from 'antd';
import axios from 'axios';
import TextToolTip from 'components/TextToolTip';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { querySearchParams } from 'constants/queryBuilderQueryNames';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import useErrorNotification from 'hooks/useErrorNotification';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { ExploreHeaderToolTip, SaveButtonText } from './constants';
import MenuItemGenerator from './MenuItemGenerator';
import SaveViewWithName from './SaveViewWithName';
import {
	DropDownOverlay,
	ExplorerCardHeadContainer,
	OffSetCol,
} from './styles';
import { ExplorerCardProps } from './types';
import { deleteViewHandler, isQueryUpdatedInView } from './utils';

function ExplorerCard({
	sourcepage,
	children,
	currentPanelType,
}: ExplorerCardProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [, setCopyUrl] = useCopyToClipboard();
	const [isQueryUpdated, setIsQueryUpdated] = useState<boolean>(false);
	const { notifications } = useNotifications();

	const onCopyUrlHandler = (): void => {
		setCopyUrl(window.location.href);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const {
		stagedQuery,
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const {
		data: viewsData,
		isLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(sourcepage);

	useErrorNotification(error);

	const handlePopOverClose = (): void => {
		setIsOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setIsOpen(newOpen);
	};

	const viewName =
		useGetSearchQueryParam(querySearchParams.viewName) || 'Query Builder';

	const viewKey = useGetSearchQueryParam(querySearchParams.viewKey) || '';

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

	const onDeleteHandler = useCallback(() => {
		deleteViewHandler({
			deleteViewAsync,
			notifications,
			panelType,
			redirectWithQueryBuilderData,
			refetchAllView,
			viewId: viewKey,
			viewKey,
		});
	}, [
		deleteViewAsync,
		notifications,
		panelType,
		redirectWithQueryBuilderData,
		refetchAllView,
		viewKey,
	]);

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
					setIsQueryUpdated(false);
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

	useEffect(() => {
		setIsQueryUpdated(
			isQueryUpdatedInView({
				data: viewsData?.data?.data,
				stagedQuery,
				viewKey,
			}),
		);
	}, [
		currentQuery,
		viewsData?.data?.data,
		stagedQuery,
		stagedQuery?.builder.queryData,
		viewKey,
	]);

	const menu = useMemo(
		(): MenuProps => ({
			items: viewsData?.data?.data?.map((view) => ({
				key: view.uuid,
				label: (
					<MenuItemGenerator
						viewName={view.name}
						viewKey={viewKey}
						createdBy={view.createdBy}
						uuid={view.uuid}
						refetchAllView={refetchAllView}
						viewData={viewsData.data.data}
						currentPanelType={currentPanelType}
					/>
				),
			})),
		}),
		[currentPanelType, refetchAllView, viewKey, viewsData?.data?.data],
	);

	const moreOptionMenu = useMemo(
		(): MenuProps => ({
			items: [
				{
					key: 'delete',
					label: <Typography.Text strong>Delete</Typography.Text>,
					onClick: onDeleteHandler,
					icon: <DeleteOutlined />,
				},
			],
		}),
		[onDeleteHandler],
	);

	const saveButtonType = isQueryUpdated ? 'default' : 'primary';
	const saveButtonIcon = isQueryUpdated ? null : <SaveOutlined />;

	return (
		<>
			<ExplorerCardHeadContainer size="small">
				<Row align="middle">
					<Col span={6}>
						<Space>
							<Typography>{viewName}</Typography>
							<TextToolTip
								url={ExploreHeaderToolTip.url}
								text={ExploreHeaderToolTip.text}
								useFilledIcon={false}
							/>
						</Space>
					</Col>
					<OffSetCol span={10} offset={8}>
						<Space size="large">
							{viewsData?.data.data && viewsData?.data.data.length && (
								<Space>
									{/* <Typography.Text>Saved Views</Typography.Text> */}
									<Dropdown.Button
										menu={menu}
										loading={isLoading || isRefetching}
										icon={<DownOutlined />}
										trigger={['click']}
										overlayStyle={DropDownOverlay}
									>
										Select View
									</Dropdown.Button>
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
								placement="bottomLeft"
								trigger="click"
								content={
									<SaveViewWithName
										sourcePage={sourcepage}
										handlePopOverClose={handlePopOverClose}
										refetchAllView={refetchAllView}
									/>
								}
								showArrow={false}
								open={isOpen}
								onOpenChange={handleOpenChange}
							>
								<Button type={saveButtonType} icon={saveButtonIcon}>
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
			<Card>{children}</Card>
		</>
	);
}

export default ExplorerCard;
