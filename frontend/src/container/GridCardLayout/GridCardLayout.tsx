import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullScreen, FullScreenHandle } from 'react-full-screen';
import { ItemCallback, Layout } from 'react-grid-layout';
import { useIsFetching } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Button, Form, Input, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { themeColors } from 'constants/theme';
import { DEFAULT_ROW_NAME } from 'container/DashboardContainer/DashboardDescription/utils';
import { useDashboardVariables } from 'hooks/dashboard/useDashboardVariables';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo, isUndefined } from 'lodash-es';
import isEqual from 'lodash-es/isEqual';
import {
	Check,
	ChevronDown,
	ChevronUp,
	GripVertical,
	LockKeyhole,
	X,
} from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import {
	selectIsDashboardLocked,
	useDashboardStore,
} from 'providers/Dashboard/store/useDashboardStore';
import { sortLayout } from 'providers/Dashboard/util';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

import { EditMenuAction, ViewMenuAction } from './config';
import DashboardEmptyState from './DashboardEmptyState/DashboardEmptyState';
import GridCard from './GridCard';
import { Card, CardContainer, ReactGridLayout } from './styles';
import {
	applyRowCollapse,
	hasColumnWidthsChanged,
	removeUndefinedValuesFromLayout,
} from './utils';
import { MenuItemKeys } from './WidgetHeader/contants';
import { WidgetRowHeader } from './WidgetRow';

import './GridCardLayout.styles.scss';

interface GraphLayoutProps {
	handle: FullScreenHandle;
	enableDrillDown?: boolean;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function GraphLayout(props: GraphLayoutProps): JSX.Element {
	const { handle, enableDrillDown = false } = props;
	const { safeNavigate } = useSafeNavigate();
	const isDashboardFetching =
		useIsFetching([REACT_QUERY_KEY.DASHBOARD_BY_ID]) > 0;

	const {
		dashboardData,
		layouts,
		setLayouts,
		panelMap,
		setPanelMap,
		setDashboardData,
		columnWidths,
	} = useDashboardStore();
	const isDashboardLocked = useDashboardStore(selectIsDashboardLocked);
	const { data } = dashboardData || {};
	const { pathname } = useLocation();
	const dispatch = useDispatch();

	const { widgets } = data || {};

	const { dashboardVariables } = useDashboardVariables();

	const { user } = useAppContext();

	const isDarkMode = useIsDarkMode();

	const [dashboardLayout, setDashboardLayout] = useState<Layout[]>([]);

	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

	const [currentSelectRowId, setCurrentSelectRowId] = useState<string | null>(
		null,
	);

	const [currentPanelMap, setCurrentPanelMap] = useState<
		Record<string, { widgets: Layout[]; collapsed: boolean }>
	>({});

	useEffect(() => {
		setCurrentPanelMap(panelMap);
	}, [panelMap]);

	const [form] = Form.useForm<{
		title: string;
	}>();

	const updateDashboardMutation = useUpdateDashboard();

	const urlQuery = useUrlQuery();

	let permissions: ComponentTypes[] = ['save_layout', 'add_panel'];

	if (isDashboardLocked) {
		permissions = ['edit_locked_dashboard', 'add_panel_locked_dashboard'];
	}

	const userRole: ROLES | null =
		dashboardData?.createdBy === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: user.role;

	const [saveLayoutPermission, addPanelPermission] = useComponentPermission(
		permissions,
		userRole,
	);

	const [deleteWidget, editWidget] = useComponentPermission(
		['delete_widget', 'edit_widget'],
		user.role,
	);

	useEffect(() => {
		setDashboardLayout(sortLayout(layouts));
	}, [layouts]);

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data)) {
			logEvent('Dashboard Detail: Opened', {
				dashboardId: dashboardData?.id,
				dashboardName: data.title,
				numberOfPanels: data.widgets?.length,
				numberOfVariables: Object.keys(dashboardVariables).length || 0,
			});
			logEventCalledRef.current = true;
		}
	}, [dashboardVariables, data, dashboardData?.id]);

	const onSaveHandler = (): void => {
		if (!dashboardData) {
			return;
		}

		const updatedDashboard: Props = {
			id: dashboardData.id,
			data: {
				...dashboardData.data,
				panelMap: { ...currentPanelMap },
				layout: dashboardLayout.filter((e) => e.i !== PANEL_TYPES.EMPTY_WIDGET),
				widgets: dashboardData?.data?.widgets?.map((widget) => {
					if (columnWidths?.[widget.id]) {
						return {
							...widget,
							columnWidths: columnWidths[widget.id],
						};
					}
					return widget;
				}),
			},
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (updatedDashboard.data) {
					if (updatedDashboard.data.data.layout) {
						setLayouts(sortLayout(updatedDashboard.data.data.layout));
					}
					setDashboardData(updatedDashboard.data);
					setPanelMap(updatedDashboard.data?.data?.panelMap || {});
				}
			},
		});
	};

	const widgetActions = !isDashboardLocked
		? [...ViewMenuAction, ...EditMenuAction]
		: [...ViewMenuAction, MenuItemKeys.CreateAlerts];

	const handleLayoutChange = (layout: Layout[]): void => {
		const filterLayout = removeUndefinedValuesFromLayout(layout);
		const filterDashboardLayout =
			removeUndefinedValuesFromLayout(dashboardLayout);
		if (!isEqual(filterLayout, filterDashboardLayout)) {
			const updatedLayout = sortLayout(layout);
			setDashboardLayout(updatedLayout);
		}
	};

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, safeNavigate, urlQuery],
	);

	useEffect(() => {
		if (
			isDashboardLocked ||
			!saveLayoutPermission ||
			updateDashboardMutation.isLoading ||
			isDashboardFetching
		) {
			return;
		}

		const shouldSaveLayout =
			dashboardLayout &&
			Array.isArray(dashboardLayout) &&
			dashboardLayout.length > 0 &&
			!isEqual(layouts, dashboardLayout);

		const shouldSaveColumnWidths =
			dashboardLayout &&
			Array.isArray(dashboardLayout) &&
			dashboardLayout.length > 0 &&
			hasColumnWidthsChanged(columnWidths, dashboardData);

		if (shouldSaveLayout || shouldSaveColumnWidths) {
			onSaveHandler();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardLayout, columnWidths]);

	const onSettingsModalSubmit = (): void => {
		const newTitle = form.getFieldValue('title');
		if (!dashboardData) {
			return;
		}

		if (!currentSelectRowId) {
			return;
		}

		const currentWidget = dashboardData?.data?.widgets?.find(
			(e) => e.id === currentSelectRowId,
		);

		if (!currentWidget) {
			return;
		}

		const updatedWidgets = dashboardData?.data?.widgets?.map((e) =>
			e.id === currentSelectRowId ? { ...e, title: newTitle } : e,
		);

		const updatedDashboardData: Props = {
			id: dashboardData.id,
			data: {
				...dashboardData.data,
				widgets: updatedWidgets,
			},
		};

		updateDashboardMutation.mutateAsync(updatedDashboardData, {
			onSuccess: (updatedDashboard) => {
				if (setLayouts) {
					setLayouts(updatedDashboard.data?.data?.layout || []);
				}
				if (setDashboardData && updatedDashboard.data) {
					setDashboardData(updatedDashboard.data);
				}
				if (setPanelMap) {
					setPanelMap(updatedDashboard.data?.data?.panelMap || {});
				}
				form.setFieldValue('title', '');
				setIsSettingsModalOpen(false);
				setCurrentSelectRowId(null);
			},
		});
	};

	useEffect(() => {
		if (!currentSelectRowId) {
			return;
		}
		form.setFieldValue(
			'title',
			(widgets?.find((widget) => widget.id === currentSelectRowId)
				?.title as string) || DEFAULT_ROW_NAME,
		);
	}, [currentSelectRowId, form, widgets]);

	const handleRowCollapse = (id: string): void => {
		if (!dashboardData) {
			return;
		}
		const { updatedLayout, updatedPanelMap } = applyRowCollapse(
			id,
			dashboardLayout,
			currentPanelMap,
		);
		setCurrentPanelMap((prev) => ({ ...prev, ...updatedPanelMap }));
		setDashboardLayout(sortLayout(updatedLayout));
	};

	const handleDragStop: ItemCallback = (_, oldItem, newItem): void => {
		if (oldItem?.i && currentPanelMap?.[oldItem.i]) {
			const differenceY = newItem.y - oldItem.y;
			const widgetsInsideRow = (currentPanelMap[oldItem.i]?.widgets ?? []).map(
				(w) => ({
					...w,
					y: w.y + differenceY,
				}),
			);
			setCurrentPanelMap((prev) => ({
				...prev,
				[oldItem.i]: {
					...prev[oldItem.i],
					widgets: widgetsInsideRow,
				},
			}));
		}
	};

	const handleRowDelete = (): void => {
		if (!dashboardData) {
			return;
		}

		if (!currentSelectRowId) {
			return;
		}

		const updatedWidgets = dashboardData?.data?.widgets?.filter(
			(e) => e.id !== currentSelectRowId,
		);

		const updatedLayout =
			dashboardData.data.layout?.filter((e) => e.i !== currentSelectRowId) || [];

		const updatedPanelMap = { ...currentPanelMap };
		delete updatedPanelMap[currentSelectRowId];

		const updatedDashboardData: Props = {
			id: dashboardData.id,
			data: {
				...dashboardData.data,
				widgets: updatedWidgets,
				layout: updatedLayout,
				panelMap: updatedPanelMap,
			},
		};

		updateDashboardMutation.mutateAsync(updatedDashboardData, {
			onSuccess: (updatedDashboard) => {
				if (setLayouts) {
					setLayouts(updatedDashboard.data?.data?.layout || []);
				}
				if (setDashboardData && updatedDashboard.data) {
					setDashboardData(updatedDashboard.data);
				}
				if (setPanelMap) {
					setPanelMap(updatedDashboard.data?.data?.panelMap || {});
				}
				setIsDeleteModalOpen(false);
				setCurrentSelectRowId(null);
			},
		});
	};
	const isDashboardEmpty = useMemo(
		() =>
			dashboardData?.data.layout ? dashboardData?.data.layout?.length === 0 : true,
		[dashboardData],
	);

	let isDataAvailableInAnyWidget = false;
	const isLogEventCalled = useRef<boolean>(false);

	return isDashboardEmpty ? (
		<DashboardEmptyState />
	) : (
		<FullScreen
			handle={handle}
			className="fullscreen-grid-container"
			data-overlayscrollbars-initialize
		>
			<ReactGridLayout
				cols={12}
				rowHeight={45}
				autoSize
				width={100}
				useCSSTransforms
				isDraggable={!isDashboardLocked && addPanelPermission}
				isDroppable={!isDashboardLocked && addPanelPermission}
				isResizable={!isDashboardLocked && addPanelPermission}
				allowOverlap={false}
				onLayoutChange={handleLayoutChange}
				onDragStop={handleDragStop}
				draggableHandle=".drag-handle"
				layout={dashboardLayout}
				style={{ backgroundColor: isDarkMode ? '' : themeColors.snowWhite }}
			>
				{dashboardLayout.map((layout) => {
					const { i: id } = layout;
					const currentWidget = (widgets || [])?.find((e) => e.id === id);

					if (currentWidget?.panelTypes === PANEL_GROUP_TYPES.ROW) {
						const rowWidgetProperties = currentPanelMap[id] || {};
						let { title } = currentWidget;
						if (rowWidgetProperties.collapsed) {
							const widgetCount = rowWidgetProperties.widgets?.length || 0;
							const collapsedText = `(${widgetCount} widget${
								widgetCount > 1 ? 's' : ''
							})`;
							title += ` ${collapsedText}`;
						}

						return (
							<CardContainer
								className="row-card"
								isDarkMode={isDarkMode}
								key={id}
								data-grid={JSON.stringify(currentWidget)}
							>
								<div className={cx('row-panel')}>
									<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
										{rowWidgetProperties.collapsed && (
											<GripVertical
												size={14}
												className="drag-handle"
												color={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_300}
												cursor="move"
											/>
										)}
										<Typography.Text className="section-title">{title}</Typography.Text>
										{rowWidgetProperties.collapsed ? (
											<ChevronDown
												size={14}
												onClick={(): void => handleRowCollapse(id)}
												className="row-icon"
											/>
										) : (
											<ChevronUp
												size={14}
												onClick={(): void => handleRowCollapse(id)}
												className="row-icon"
											/>
										)}
									</div>
									<WidgetRowHeader
										id={id}
										rowWidgetProperties={rowWidgetProperties}
										setCurrentSelectRowId={setCurrentSelectRowId}
										setIsDeleteModalOpen={setIsDeleteModalOpen}
										setIsSettingsModalOpen={setIsSettingsModalOpen}
										editWidget={editWidget}
										deleteWidget={deleteWidget}
									/>
								</div>
							</CardContainer>
						);
					}

					const checkIfDataExists = (isDataAvailable: boolean): void => {
						if (!isDataAvailableInAnyWidget && isDataAvailable) {
							isDataAvailableInAnyWidget = true;
						}
						if (!isLogEventCalled.current && isDataAvailableInAnyWidget) {
							isLogEventCalled.current = true;
							logEvent('Dashboard Detail: Panel data fetched', {
								isDataAvailableInAnyWidget,
							});
						}
					};

					return (
						<CardContainer
							className={isDashboardLocked ? '' : 'enable-resize'}
							isDarkMode={isDarkMode}
							key={id}
							data-grid={JSON.stringify(currentWidget)}
						>
							<Card
								className="grid-item"
								isDarkMode={isDarkMode}
								$panelType={currentWidget?.panelTypes || PANEL_TYPES.TIME_SERIES}
							>
								<GridCard
									widget={(currentWidget as Widgets) || ({ id, query: {} } as Widgets)}
									headerMenuList={widgetActions}
									variables={dashboardVariables}
									// version={dashboardData?.data?.version}
									version={ENTITY_VERSION_V5}
									onDragSelect={onDragSelect}
									dataAvailable={checkIfDataExists}
									enableDrillDown={enableDrillDown}
								/>
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
			{isDashboardLocked && (
				<div className="footer">
					<Button
						type="text"
						icon={<LockKeyhole size={14} />}
						className="locked-text"
					>
						Locked
					</Button>
					<div className="locked-bar" />
				</div>
			)}
			<Modal
				open={isSettingsModalOpen}
				title="Rename Section"
				rootClassName="rename-section"
				destroyOnClose
				footer={null}
				onCancel={(): void => {
					setIsSettingsModalOpen(false);
					setCurrentSelectRowId(null);
				}}
			>
				<Form form={form} onFinish={onSettingsModalSubmit} requiredMark>
					<Typography.Text className="typography">
						Enter section name
					</Typography.Text>
					<Form.Item required name={['title']}>
						<Input
							placeholder="Enter row name here..."
							defaultValue={defaultTo(
								widgets?.find((widget) => widget.id === currentSelectRowId)
									?.title as string,
								'Sample Title',
							)}
						/>
					</Form.Item>
					<Form.Item>
						<div className="action-btns">
							<Button
								type="primary"
								htmlType="submit"
								className="ok-btn"
								icon={<Check size={14} />}
								disabled={updateDashboardMutation.isLoading}
							>
								Apply Changes
							</Button>
							<Button
								type="text"
								className="cancel-btn"
								icon={<X size={14} />}
								onClick={(): void => {
									setIsSettingsModalOpen(false);
									setCurrentSelectRowId(null);
								}}
							>
								Cancel
							</Button>
						</div>
					</Form.Item>
				</Form>
			</Modal>
			<Modal
				open={isDeleteModalOpen}
				title="Delete Row"
				destroyOnClose
				onCancel={(): void => {
					setIsDeleteModalOpen(false);
					setCurrentSelectRowId(null);
				}}
				onOk={(): void => handleRowDelete()}
			>
				<Typography.Text>Are you sure you want to delete this row</Typography.Text>
			</Modal>
		</FullScreen>
	);
}

export default GraphLayout;

GraphLayout.defaultProps = {
	enableDrillDown: false,
};
