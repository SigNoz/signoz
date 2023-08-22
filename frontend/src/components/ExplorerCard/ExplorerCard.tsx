import {
	DownOutlined,
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
import TextToolTip from 'components/TextToolTip';
import { querySearchParams } from 'constants/queryBuilderQueryNames';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import useErrorNotification from 'hooks/useErrorNotification';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { ViewProps } from 'types/api/saveViews/types';

import { ExploreHeaderToolTip } from './constants';
import MenuItemGenerator from './MenuItemGenerator';
import SaveViewWithName from './SaveViewWithName';
import {
	DropDownOverlay,
	ExplorerCardHeadContainer,
	OffSetCol,
} from './styles';
import { ExplorerCardProps } from './types';
import {
	getViewDetailsUsingViewKey,
	isQueryUpdatedInView,
	updateQueryHandler,
} from './utils';

function ExplorerCard({
	sourcepage,
	children,
}: ExplorerCardProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [copyUrl, setCopyUrl] = useCopyToClipboard();
	const [isQueryUpdated, setIsQueryUpdated] = useState<boolean>(false);
	const { notifications } = useNotifications();
	const panelType = useGetPanelTypesQueryParam();

	const onCopyUrlHandler = (): void => {
		setCopyUrl(window.location.href);
	};

	const {
		stagedQuery,
		currentQuery,
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

	const onUpdateQueryHandler = useCallback(async () => {
		await updateQueryHandler({
			compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
			viewKey,
			extraData: '',
			sourcePage: sourcepage,
			viewName,
			notifications,
			setIsQueryUpdated,
			updateViewAsync,
		});
		refetchAllView();
	}, [
		currentQuery,
		notifications,
		panelType,
		refetchAllView,
		sourcepage,
		updateViewAsync,
		viewKey,
		viewName,
	]);

	const onMenuItemSelectHandler = useCallback(
		({ key }: { key: string }): void => {
			const currentViewDetails = getViewDetailsUsingViewKey(
				key,
				viewsData?.data?.data,
			);
			if (!currentViewDetails) return;
			const { query, name, uuid } = currentViewDetails;

			redirectWithQueryBuilderData(query, {
				[querySearchParams.viewName]: name,
				[querySearchParams.viewKey]: uuid,
			});
		},
		[viewsData?.data?.data, redirectWithQueryBuilderData],
	);

	useEffect(() => {
		if (copyUrl.value) {
			notifications.success({
				message: 'Copied to clipboard',
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [copyUrl.value]);

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

	const generatorMenuItems = useCallback(
		(data: ViewProps[] | undefined): MenuProps['items'] => {
			if (!data) return [];

			return data.map((view) => ({
				key: view.uuid,
				label: (
					<MenuItemGenerator
						viewName={view.name}
						viewKey={viewKey}
						createdBy={view.createdBy}
						uuid={view.uuid}
						refetchAllView={refetchAllView}
						onMenuItemSelectHandler={onMenuItemSelectHandler}
					/>
				),
			}));
		},
		[onMenuItemSelectHandler, refetchAllView, viewKey],
	);

	const updateMenuList = useMemo(
		() => generatorMenuItems(viewsData?.data.data),
		[viewsData?.data.data, generatorMenuItems],
	);

	const menu = useMemo(
		(): MenuProps => ({
			items: updateMenuList,
		}),
		[updateMenuList],
	);

	return (
		<>
			<ExplorerCardHeadContainer size="small">
				<Row>
					<Col span={6}>
						<Space>
							<Typography>{viewName}</Typography>
							<TextToolTip
								url={ExploreHeaderToolTip.url}
								text={ExploreHeaderToolTip.text}
							/>
						</Space>
					</Col>
					<OffSetCol span={10} offset={8}>
						<Space size="large">
							{isQueryUpdated && (
								<Button type="primary" onClick={onUpdateQueryHandler}>
									Updated View
								</Button>
							)}
							{viewsData?.data.data && viewsData?.data.data.length && (
								<Space>
									<Typography.Text>Saved Views</Typography.Text>
									<Dropdown.Button
										menu={menu}
										loading={isLoading || isRefetching}
										icon={<DownOutlined />}
										trigger={['click']}
										overlayStyle={DropDownOverlay}
									>
										Select
									</Dropdown.Button>
								</Space>
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
								<Button type="primary" icon={<SaveOutlined />}>
									{isQueryUpdated ? 'Save as new View' : 'Save View'}
								</Button>
							</Popover>
							<ShareAltOutlined onClick={onCopyUrlHandler} />
						</Space>
					</OffSetCol>
				</Row>
			</ExplorerCardHeadContainer>
			<Card>{children}</Card>
		</>
	);
}

export default ExplorerCard;
