import './ExplorerOptions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	ColorPicker,
	Divider,
	Input,
	Modal,
	RefSelectProps,
	Select,
	Tooltip,
	Typography,
} from 'antd';
import axios from 'axios';
import { getViewDetailsUsingViewKey } from 'components/ExplorerCard/utils';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useErrorNotification from 'hooks/useErrorNotification';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { Check, ConciergeBell, Disc3, Plus, X, XCircle } from 'lucide-react';
import { CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	DATASOURCE_VS_ROUTES,
	generateRGBAFromHex,
	getRandomColor,
	saveNewViewHandler,
} from './utils';

function ExplorerOptions({
	disabled,
	isLoading,
	onExport,
	query,
	sourcepage,
}: ExplorerOptionsProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);
	const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
	const [newViewName, setNewViewName] = useState<string>('');
	const [color, setColor] = useState(Color.BG_SIENNA_500);
	const { notifications } = useNotifications();
	const history = useHistory();
	const ref = useRef<RefSelectProps>(null);
	const isDarkMode = useIsDarkMode();

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const handleSaveViewModalToggle = (): void => {
		setIsSaveModalOpen(!isSaveModalOpen);
	};

	const hideSaveViewModal = (): void => {
		setIsSaveModalOpen(false);
	};

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

	const {
		currentQuery,
		panelType,
		isStagedQueryUpdated,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const compositeQuery = mapCompositeQueryFromQuery(currentQuery, panelType);

	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';
	const viewKey = useGetSearchQueryParam(QueryParams.viewKey) || '';

	const extraData = viewsData?.data.data.find((view) => view.uuid === viewKey)
		?.extraData;

	const extraDataColor = extraData ? JSON.parse(extraData).color : '';
	const rgbaColor = generateRGBAFromHex(
		extraDataColor || Color.BG_SIENNA_500,
		0.08,
	);

	const {
		mutateAsync: updateViewAsync,
		isLoading: isViewUpdating,
	} = useUpdateView({
		compositeQuery,
		viewKey,
		extraData: extraData || JSON.stringify({ color: Color.BG_SIENNA_500 }),
		sourcePage: sourcepage,
		viewName,
	});

	const showErrorNotification = (err: Error): void => {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	};

	const onUpdateQueryHandler = (): void => {
		const extraData = viewsData?.data.data.find((view) => view.uuid === viewKey)
			?.extraData;
		updateViewAsync(
			{
				compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
				viewKey,
				extraData: extraData || JSON.stringify({ color: Color.BG_SIENNA_500 }),
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

	const handleSelect = (
		value: string,
		option: { key: string; value: string },
	): void => {
		onMenuItemSelectHandler({
			key: option.key,
		});
		if (ref.current) {
			ref.current.blur();
		}
	};

	const handleClearSelect = (): void => {
		history.replace(DATASOURCE_VS_ROUTES[sourcepage]);
	};

	const isQueryUpdated = isStagedQueryUpdated(viewsData?.data?.data, viewKey);

	const {
		isLoading: isSaveViewLoading,
		mutateAsync: saveViewAsync,
	} = useSaveView({
		viewName: newViewName || '',
		compositeQuery,
		sourcePage: sourcepage,
		extraData: JSON.stringify({ color }),
	});

	const onSaveHandler = (): void => {
		saveNewViewHandler({
			compositeQuery,
			handlePopOverClose: hideSaveViewModal,
			extraData: JSON.stringify({ color }),
			notifications,
			panelType: panelType || PANEL_TYPES.LIST,
			redirectWithQueryBuilderData,
			refetchAllView,
			saveViewAsync,
			sourcePage: sourcepage,
			viewName: newViewName,
			setNewViewName,
		});
	};

	// TODO: Remove this and move this to scss file
	const dropdownStyle: CSSProperties = useMemo(
		() => ({
			borderRadius: '4px',
			border: isDarkMode
				? `1px solid ${Color.BG_SLATE_400}`
				: `1px solid ${Color.BG_VANILLA_300}`,
			background: isDarkMode
				? 'linear-gradient(139deg, rgba(18, 19, 23, 0.80) 0%, rgba(18, 19, 23, 0.90) 98.68%)'
				: 'linear-gradient(139deg, rgba(241, 241, 241, 0.8) 0%, rgba(241, 241, 241, 0.9) 98.68%)',
			boxShadow: '4px 10px 16px 2px rgba(0, 0, 0, 0.20)',
			backdropFilter: 'blur(20px)',
			bottom: '74px',
			width: '191px',
		}),
		[isDarkMode],
	);

	return (
		<>
			{isQueryUpdated && (
				<div className="explorer-update">
					<Tooltip title="Clear this view" placement="top">
						<Button
							className="action-icon"
							onClick={handleClearSelect}
							icon={<X size={14} />}
						/>
					</Tooltip>
					<Divider type="vertical" />
					<Tooltip title="Update this view" placement="top">
						<Button
							className="action-icon"
							disabled={isViewUpdating}
							onClick={onUpdateQueryHandler}
							icon={<Disc3 size={14} />}
						/>
					</Tooltip>
				</div>
			)}
			<div
				className="explorer-options"
				style={{
					background: extraData
						? `linear-gradient(90deg, rgba(0,0,0,0) -5%, ${rgbaColor} 9%, rgba(0,0,0,0) 30%)`
						: 'transparent',
					backdropFilter: 'blur(20px)',
				}}
			>
				<div className="view-options">
					<Select<string, { key: string; value: string }>
						showSearch
						placeholder="Select a view"
						loading={viewsIsLoading || isRefetching}
						value={viewName || undefined}
						onSelect={handleSelect}
						style={{
							minWidth: 170,
						}}
						dropdownStyle={dropdownStyle}
						className="views-dropdown"
						allowClear={{
							clearIcon: <XCircle size={16} style={{ marginTop: '-3px' }} />,
						}}
						onClear={handleClearSelect}
						ref={ref}
					>
						{viewsData?.data.data.map((view) => {
							const extraData =
								view.extraData !== '' ? JSON.parse(view.extraData) : '';
							let bgColor = getRandomColor();
							if (extraData !== '') {
								bgColor = extraData.color;
							}
							return (
								<Select.Option key={view.uuid} value={view.name}>
									<div className="render-options">
										<span
											className="dot"
											style={{
												background: bgColor,
												boxShadow: `0px 0px 6px 0px ${bgColor}`,
											}}
										/>{' '}
										{view.name}
									</div>
								</Select.Option>
							);
						})}
					</Select>

					<Button
						shape="round"
						onClick={handleSaveViewModalToggle}
						disabled={viewsIsLoading || isRefetching}
					>
						<Disc3 size={16} /> Save this view
					</Button>
				</div>

				<hr />

				<div className="actions">
					<Tooltip title="Create Alerts">
						<Button
							disabled={disabled}
							shape="circle"
							onClick={onCreateAlertsHandler}
						>
							<ConciergeBell size={16} />
						</Button>
					</Tooltip>

					<Tooltip title="Add to Dashboard">
						<Button disabled={disabled} shape="circle" onClick={onAddToDashboard}>
							<Plus size={16} />
						</Button>
					</Tooltip>
				</div>
			</div>

			<Modal
				className="save-view-modal"
				title={<span className="title">Save this view</span>}
				open={isSaveModalOpen}
				closable
				onCancel={hideSaveViewModal}
				footer={[
					<Button
						key="submit"
						type="primary"
						icon={<Check size={16} />}
						onClick={onSaveHandler}
						disabled={isSaveViewLoading}
					>
						Save this view
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
						placeholder="e.g. External http method view"
						value={newViewName}
						onChange={(e): void => setNewViewName(e.target.value)}
					/>
				</div>
			</Modal>

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
