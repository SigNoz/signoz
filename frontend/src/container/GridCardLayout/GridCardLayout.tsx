import './GridCardLayout.styles.scss';

import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Form, Input, Modal, Typography } from 'antd';
import { useForm } from 'antd/es/form/Form';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { DEFAULT_ROW_NAME } from 'container/NewDashboard/DashboardDescription/utils';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
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
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { sortLayout } from 'providers/Dashboard/util';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullScreen, FullScreenHandle } from 'react-full-screen';
import { ItemCallback, Layout } from 'react-grid-layout';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

import { EditMenuAction, ViewMenuAction } from './config';
import DashboardEmptyState from './DashboardEmptyState/DashboardEmptyState';
import GridCard from './GridCard';
import { Card, CardContainer, ReactGridLayout } from './styles';
import { removeUndefinedValuesFromLayout } from './utils';
import { MenuItemKeys } from './WidgetHeader/contants';
import { WidgetRowHeader } from './WidgetRow';

interface GraphLayoutProps {
	handle: FullScreenHandle;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function GraphLayout(props: GraphLayoutProps): JSX.Element {
	const { handle } = props;
	const { safeNavigate } = useSafeNavigate();
	const {
		selectedDashboard,
		layouts,
		setLayouts,
		panelMap,
		setPanelMap,
		setSelectedDashboard,
		isDashboardLocked,
		dashboardQueryRangeCalled,
		setDashboardQueryRangeCalled,
		setSelectedRowWidgetId,
		isDashboardFetching,
	} = useDashboard();
	const { data } = selectedDashboard || {};
	const { pathname } = useLocation();
	const dispatch = useDispatch();

	const { widgets, variables } = data || {};

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

	const [form] = useForm<{
		title: string;
	}>();

	const updateDashboardMutation = useUpdateDashboard();

	const { notifications } = useNotifications();
	const urlQuery = useUrlQuery();

	let permissions: ComponentTypes[] = ['save_layout', 'add_panel'];

	if (isDashboardLocked) {
		permissions = ['edit_locked_dashboard', 'add_panel_locked_dashboard'];
	}

	const userRole: ROLES | null =
		selectedDashboard?.created_by === user?.email
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

	useEffect(() => {
		setDashboardQueryRangeCalled(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			// Send Sentry event if query_range is not called within expected timeframe (2 mins) when there are widgets
			if (!dashboardQueryRangeCalled && data?.widgets?.length) {
				Sentry.captureEvent({
					message: `Dashboard query range not called within expected timeframe even when there are ${data?.widgets?.length} widgets`,
					level: 'warning',
				});
			}
		}, 120000);

		return (): void => clearTimeout(timeoutId);
	}, [dashboardQueryRangeCalled, data?.widgets?.length]);

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data)) {
			logEvent('Dashboard Detail: Opened', {
				dashboardId: data.uuid,
				dashboardName: data.title,
				numberOfPanels: data.widgets?.length,
				numberOfVariables: Object.keys(data?.variables || {}).length || 0,
			});
			logEventCalledRef.current = true;
		}
	}, [data]);
	const onSaveHandler = (): void => {
		if (!selectedDashboard) return;

		const updatedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				panelMap: { ...currentPanelMap },
				layout: dashboardLayout.filter((e) => e.i !== PANEL_TYPES.EMPTY_WIDGET),
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: (updatedDashboard) => {
				setSelectedRowWidgetId(null);
				if (updatedDashboard.payload) {
					if (updatedDashboard.payload.data.layout)
						setLayouts(sortLayout(updatedDashboard.payload.data.layout));
					setSelectedDashboard(updatedDashboard.payload);
					setPanelMap(updatedDashboard.payload?.data?.panelMap || {});
				}
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	};

	const widgetActions = !isDashboardLocked
		? [...ViewMenuAction, ...EditMenuAction]
		: [...ViewMenuAction, MenuItemKeys.CreateAlerts];

	const handleLayoutChange = (layout: Layout[]): void => {
		const filterLayout = removeUndefinedValuesFromLayout(layout);
		const filterDashboardLayout = removeUndefinedValuesFromLayout(
			dashboardLayout,
		);
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
			dashboardLayout &&
			Array.isArray(dashboardLayout) &&
			dashboardLayout.length > 0 &&
			!isEqual(layouts, dashboardLayout) &&
			!isDashboardLocked &&
			saveLayoutPermission &&
			!updateDashboardMutation.isLoading &&
			!isDashboardFetching
		) {
			onSaveHandler();
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardLayout]);

	const onSettingsModalSubmit = (): void => {
		const newTitle = form.getFieldValue('title');
		if (!selectedDashboard) return;

		if (!currentSelectRowId) return;

		const currentWidget = selectedDashboard?.data?.widgets?.find(
			(e) => e.id === currentSelectRowId,
		);

		if (!currentWidget) return;

		currentWidget.title = newTitle;
		const updatedWidgets = selectedDashboard?.data?.widgets?.filter(
			(e) => e.id !== currentSelectRowId,
		);

		updatedWidgets?.push(currentWidget);

		const updatedSelectedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				widgets: updatedWidgets,
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutateAsync(updatedSelectedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (setLayouts) setLayouts(updatedDashboard.payload?.data?.layout || []);
				if (setSelectedDashboard && updatedDashboard.payload) {
					setSelectedDashboard(updatedDashboard.payload);
				}
				if (setPanelMap)
					setPanelMap(updatedDashboard.payload?.data?.panelMap || {});
				form.setFieldValue('title', '');
				setIsSettingsModalOpen(false);
				setCurrentSelectRowId(null);
			},
			// eslint-disable-next-line sonarjs/no-identical-functions
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	};

	useEffect(() => {
		if (!currentSelectRowId) return;
		form.setFieldValue(
			'title',
			(widgets?.find((widget) => widget.id === currentSelectRowId)
				?.title as string) || DEFAULT_ROW_NAME,
		);
	}, [currentSelectRowId, form, widgets]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const handleRowCollapse = (id: string): void => {
		if (!selectedDashboard) return;
		const rowProperties = { ...currentPanelMap[id] };
		const updatedPanelMap = { ...currentPanelMap };

		let updatedDashboardLayout = [...dashboardLayout];
		if (rowProperties.collapsed === true) {
			rowProperties.collapsed = false;
			const widgetsInsideTheRow = rowProperties.widgets;
			let maxY = 0;
			widgetsInsideTheRow.forEach((w) => {
				maxY = Math.max(maxY, w.y + w.h);
			});
			const currentRowWidget = dashboardLayout.find((w) => w.i === id);
			if (currentRowWidget && widgetsInsideTheRow.length) {
				maxY -= currentRowWidget.h + currentRowWidget.y;
			}

			const idxCurrentRow = dashboardLayout.findIndex((w) => w.i === id);

			for (let j = idxCurrentRow + 1; j < dashboardLayout.length; j++) {
				updatedDashboardLayout[j].y += maxY;
				if (updatedPanelMap[updatedDashboardLayout[j].i]) {
					updatedPanelMap[updatedDashboardLayout[j].i].widgets = updatedPanelMap[
						updatedDashboardLayout[j].i
						// eslint-disable-next-line @typescript-eslint/no-loop-func
					].widgets.map((w) => ({
						...w,
						y: w.y + maxY,
					}));
				}
			}
			updatedDashboardLayout = [...updatedDashboardLayout, ...widgetsInsideTheRow];
		} else {
			rowProperties.collapsed = true;
			const currentIdx = dashboardLayout.findIndex((w) => w.i === id);

			let widgetsInsideTheRow: Layout[] = [];
			let isPanelMapUpdated = false;
			for (let j = currentIdx + 1; j < dashboardLayout.length; j++) {
				if (currentPanelMap[dashboardLayout[j].i]) {
					rowProperties.widgets = widgetsInsideTheRow;
					widgetsInsideTheRow = [];
					isPanelMapUpdated = true;
					break;
				} else {
					widgetsInsideTheRow.push(dashboardLayout[j]);
				}
			}
			if (!isPanelMapUpdated) {
				rowProperties.widgets = widgetsInsideTheRow;
			}
			let maxY = 0;
			widgetsInsideTheRow.forEach((w) => {
				maxY = Math.max(maxY, w.y + w.h);
			});
			const currentRowWidget = dashboardLayout[currentIdx];
			if (currentRowWidget && widgetsInsideTheRow.length) {
				maxY -= currentRowWidget.h + currentRowWidget.y;
			}
			for (let j = currentIdx + 1; j < updatedDashboardLayout.length; j++) {
				updatedDashboardLayout[j].y += maxY;
				if (updatedPanelMap[updatedDashboardLayout[j].i]) {
					updatedPanelMap[updatedDashboardLayout[j].i].widgets = updatedPanelMap[
						updatedDashboardLayout[j].i
						// eslint-disable-next-line @typescript-eslint/no-loop-func
					].widgets.map((w) => ({
						...w,
						y: w.y + maxY,
					}));
				}
			}

			updatedDashboardLayout = updatedDashboardLayout.filter(
				(widget) => !rowProperties.widgets.some((w: Layout) => w.i === widget.i),
			);
		}
		setCurrentPanelMap((prev) => ({
			...prev,
			...updatedPanelMap,
			[id]: {
				...rowProperties,
			},
		}));

		setDashboardLayout(sortLayout(updatedDashboardLayout));
	};

	const handleDragStop: ItemCallback = (_, oldItem, newItem): void => {
		if (currentPanelMap[oldItem.i]) {
			const differenceY = newItem.y - oldItem.y;
			const widgetsInsideRow = currentPanelMap[oldItem.i].widgets.map((w) => ({
				...w,
				y: w.y + differenceY,
			}));
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
		if (!selectedDashboard) return;

		if (!currentSelectRowId) return;

		const updatedWidgets = selectedDashboard?.data?.widgets?.filter(
			(e) => e.id !== currentSelectRowId,
		);

		const updatedLayout =
			selectedDashboard.data.layout?.filter((e) => e.i !== currentSelectRowId) ||
			[];

		const updatedPanelMap = { ...currentPanelMap };
		delete updatedPanelMap[currentSelectRowId];

		const updatedSelectedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				widgets: updatedWidgets,
				layout: updatedLayout,
				panelMap: updatedPanelMap,
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutateAsync(updatedSelectedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (setLayouts) setLayouts(updatedDashboard.payload?.data?.layout || []);
				if (setSelectedDashboard && updatedDashboard.payload) {
					setSelectedDashboard(updatedDashboard.payload);
				}
				if (setPanelMap)
					setPanelMap(updatedDashboard.payload?.data?.panelMap || {});
				setIsDeleteModalOpen(false);
				setCurrentSelectRowId(null);
			},
			// eslint-disable-next-line sonarjs/no-identical-functions
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	};
	const isDashboardEmpty = useMemo(
		() =>
			selectedDashboard?.data.layout
				? selectedDashboard?.data.layout?.length === 0
				: true,
		[selectedDashboard],
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
									variables={variables}
									version={selectedDashboard?.data?.version}
									onDragSelect={onDragSelect}
									dataAvailable={checkIfDataExists}
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
