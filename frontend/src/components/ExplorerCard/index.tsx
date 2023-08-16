import { DownOutlined, SaveOutlined } from '@ant-design/icons';
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
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import useErrorNotification from 'hooks/useErrorNotification';
import useUrlQuery from 'hooks/useUrlQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useCallback, useMemo, useState } from 'react';
import { ViewProps } from 'types/api/saveViews/types';

import MenuItemGenerator from './MenuItemGenerator';
import SaveViewWithName from './SaveViewWithName';
import {
	DropDownOverlay,
	ExplorerCardHeadContainer,
	OffSetCol,
} from './styles';

function ExplorerCard({ sourcepage, children }: Props): JSX.Element {
	const urlQuery = useUrlQuery();
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const handlePopOverClose = (): void => {
		setIsOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setIsOpen(newOpen);
	};

	const viewNameFromQuery = useMemo(() => urlQuery.get('name'), [urlQuery]);

	const viewName = viewNameFromQuery
		? JSON.parse(viewNameFromQuery)
		: 'Query Builder';
	const {
		data,
		isLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(sourcepage);
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	useErrorNotification(error);

	const generatorMenuItems = useCallback(
		(data: ViewProps[] | undefined): MenuProps['items'] => {
			if (!data) return [];

			return data.map((view) => ({
				key: view.uuid,
				label: (
					<MenuItemGenerator
						viewName={view.name}
						createdBy={view.createdBy}
						uuid={view.uuid}
					/>
				),
			}));
		},
		[],
	);

	const updateMenuList = useMemo(() => generatorMenuItems(data?.data.data), [
		data?.data.data,
		generatorMenuItems,
	]);

	const onMenuItemSelectHandler: MenuProps['onClick'] = useCallback(
		({ key }: { key: string }): void => {
			const selectedView = data?.data.data.find((view) => view.uuid === key);

			if (!selectedView) return;

			const { compositeQuery, name } = selectedView;
			const query = mapQueryDataFromApi(compositeQuery);

			redirectWithQueryBuilderData(query, { name });
		},
		[data?.data.data, redirectWithQueryBuilderData],
	);

	const menu = useMemo(
		(): MenuProps => ({
			items: updateMenuList,
			onClick: onMenuItemSelectHandler,
			style: { padding: 0 },
		}),
		[onMenuItemSelectHandler, updateMenuList],
	);

	return (
		<>
			<ExplorerCardHeadContainer size="small">
				<Row>
					<Col span={6}>
						<Space>
							<Typography>{viewName}</Typography>
							<TextToolTip
								url="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=new-query-builder"
								text="More details on how to use query builder"
							/>
						</Space>
					</Col>
					<OffSetCol span={10} offset={8}>
						<Space size="large">
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
									Save View
								</Button>
							</Popover>
						</Space>
					</OffSetCol>
				</Row>
			</ExplorerCardHeadContainer>
			<Card>{children}</Card>
		</>
	);
}

interface Props {
	sourcepage: 'metrics' | 'traces' | 'logs';
	children: React.ReactNode;
}

export default ExplorerCard;
