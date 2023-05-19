import { PlusOutlined, SaveFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import { FeatureKeys } from 'constants/features';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useFeatureFlag, { MESSAGE } from 'hooks/useFeatureFlag';
import React from 'react';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import { LayoutProps, State } from '.';
import {
	Button,
	ButtonContainer,
	Card,
	CardContainer,
	NoPanelAvialable,
	ReactGridLayout,
} from './styles';

function GraphLayout({
	layouts,
	saveLayoutState,
	onLayoutSaveHandler,
	addPanelLoading,
	onAddPanelHandler,
	onLayoutChangeHandler,
	widgets,
	setLayout,
}: GraphLayoutProps): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isDarkMode = useIsDarkMode();

	const [saveLayoutPermission, addPanelPermission] = useComponentPermission(
		['save_layout', 'add_panel'],
		role,
	);

	const queryBuilderFeature = useFeatureFlag(FeatureKeys.QUERY_BUILDER_PANELS);

	return (
		<>
			<ButtonContainer>
				{saveLayoutPermission && (
					<Button
						loading={saveLayoutState.loading}
						onClick={(): Promise<void> => onLayoutSaveHandler(layouts)}
						icon={<SaveFilled />}
						danger={saveLayoutState.error}
					>
						Save Layout
					</Button>
				)}

				{addPanelPermission && (
					<Button
						loading={addPanelLoading}
						disabled={addPanelLoading}
						onClick={onAddPanelHandler}
						icon={<PlusOutlined />}
					>
						Add Panel
					</Button>
				)}
			</ButtonContainer>

			<ReactGridLayout
				cols={12}
				rowHeight={100}
				autoSize
				width={100}
				isDraggable={addPanelPermission}
				isDroppable={addPanelPermission}
				isResizable={addPanelPermission}
				useCSSTransforms
				allowOverlap={false}
				onLayoutChange={onLayoutChangeHandler}
				draggableHandle=".drag-handle"
			>
				{layouts.map(({ Component, ...rest }, layoutIndex) => {
					const currentWidget = (widgets || [])?.find((e) => e.id === rest.i);

					const usageLimit = queryBuilderFeature?.usage_limit || 0;

					const isPanelNotAvialable = usageLimit > 0 && usageLimit <= layoutIndex;

					if (isPanelNotAvialable) {
						return (
							<CardContainer
								data-grid={rest}
								isDarkMode={isDarkMode}
								key={currentWidget?.id}
							>
								<Card>
									<Typography.Text type="danger">
										<NoPanelAvialable isDarkMode={isDarkMode}>
											{MESSAGE.WIDGET.replace('{{widget}}', usageLimit.toString())}
										</NoPanelAvialable>
									</Typography.Text>
								</Card>
							</CardContainer>
						);
					}

					return (
						<CardContainer
							isDarkMode={isDarkMode}
							key={currentWidget?.id || 'empty'} // don't change this key
							data-grid={rest}
						>
							<Card>
								<Component setLayout={setLayout} />
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
		</>
	);
}

interface GraphLayoutProps {
	layouts: LayoutProps[];
	saveLayoutState: State;
	onLayoutSaveHandler: (layout: Layout[]) => Promise<void>;
	addPanelLoading: boolean;
	onAddPanelHandler: VoidFunction;
	onLayoutChangeHandler: (layout: Layout[]) => Promise<void>;
	widgets: Widgets[] | undefined;
	setLayout: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
}

export default GraphLayout;
