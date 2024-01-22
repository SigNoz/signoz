import './ExplorerOptions.styles.scss';

import { Button, Modal, Select, Tooltip } from 'antd';
import axios from 'axios';
import { getViewDetailsUsingViewKey } from 'components/ExplorerCard/utils';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import useErrorNotification from 'hooks/useErrorNotification';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { ConciergeBell, Disc3, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { DATASOURCE_VS_ROUTES } from './constants';

function ExplorerOptions({
	disabled,
	isLoading,
	onExport,
	query,
	sourcepage,
}: ExplorerOptionsProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);
	const { notifications } = useNotifications();
	const history = useHistory();

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const onCreateAlertsHandler = useCallback(() => {
		history.push(
			`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
				JSON.stringify(query),
			)}`,
		);
	}, [history, query]);

	const onCancel = (value: boolean) => (): void => {
		onModalToggle(value);
	};

	const onAddToDashboard = (): void => {
		setIsExport(true);
	};

	const {
		data: viewsData,
		isLoading: viewsIsLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(sourcepage);

	const { currentQuery, panelType, isStagedQueryUpdated } = useQueryBuilder();

	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';
	const viewKey = useGetSearchQueryParam(QueryParams.viewKey) || '';

	const { mutateAsync: updateViewAsync } = useUpdateView({
		compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
		viewKey,
		extraData: '',
		sourcePage: sourcepage,
		viewName,
	});

	const showErrorNotification = (err: Error): void => {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	};

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

	useErrorNotification(error);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const onMenuItemSelectHandler = useCallback(
		({ key }: { key: string }): void => {
			const currentViewDetails = getViewDetailsUsingViewKey(
				key,
				viewsData?.data.data,
			);
			if (!currentViewDetails) return;
			const {
				query,
				name,
				uuid,
				panelType: currentPanelType,
			} = currentViewDetails;

			handleExplorerTabChange(currentPanelType, {
				query,
				name,
				uuid,
			});
		},
		[viewsData, handleExplorerTabChange],
	);

	const onClearHandler = (): void => {
		history.replace(DATASOURCE_VS_ROUTES[sourcepage]);
	};

	const handleSelect = (
		value: string,
		option: { key: string; value: string },
	): void => {
		onMenuItemSelectHandler({
			key: option.key,
		});
	};

	const isQueryUpdated = isStagedQueryUpdated(viewsData?.data?.data, viewKey);

	return (
		<>
			<div className="explorer-options">
				{viewsData?.data.data && viewsData?.data.data.length && (
					<>
						<div className="view-options">
							<Select<string, { key: string; value: string }>
								getPopupContainer={popupContainer}
								showSearch
								placeholder="Select a view"
								optionFilterProp="children"
								loading={viewsIsLoading || isRefetching}
								optionLabelProp="value"
								value={viewName || undefined}
								onSelect={handleSelect}
								style={{
									width: 150,
								}}
								allowClear
								onClear={onClearHandler}
							>
								{viewsData?.data.data.map((view) => (
									<Select.Option key={view.uuid} value={view.name}>
										<Tooltip title={view.name} placement="right">
											{view.name}
										</Tooltip>
									</Select.Option>
								))}
							</Select>

							<Button
								shape="round"
								onClick={onUpdateQueryHandler}
								disabled={!isQueryUpdated}
							>
								<Disc3 size={16} /> Save this view
							</Button>
						</div>

						<hr />
					</>
				)}

				<div className="actions">
					<Button disabled={disabled} shape="circle" onClick={onCreateAlertsHandler}>
						<ConciergeBell size={16} />
					</Button>

					<Button disabled={disabled} shape="circle" onClick={onAddToDashboard}>
						<Plus size={16} />
					</Button>
				</div>
			</div>

			<Modal
				footer={null}
				onOk={onCancel(false)}
				onCancel={onCancel(false)}
				open={isExport}
				centered
				destroyOnClose
			>
				<ExportPanelContainer
					query={query}
					isLoading={isLoading}
					onExport={onExport}
				/>
			</Modal>
		</>
	);
}

export interface ExplorerOptionsProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null) => void;
	query: Query | null;
	disabled: boolean;
	sourcepage: DataSource;
}

ExplorerOptions.defaultProps = { isLoading: false };

export default ExplorerOptions;
