import { PANEL_TYPES_COMPONENT_MAP } from 'constants/panelTypes';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GRID_TABLE_CONFIG } from 'container/GridTableComponent/config';
import { FC, memo, useMemo } from 'react';

import { GridPanelSwitchProps, PropsTypePropsMap } from './types';

function GridPanelSwitch({
	panelType,
	data,
	title,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
	panelData,
	query,
}: GridPanelSwitchProps): JSX.Element | null {
	const currentProps: PropsTypePropsMap = useMemo(() => {
		const result: PropsTypePropsMap = {
			[PANEL_TYPES.TIME_SERIES]: {
				type: 'line',
				data,
				title,
				isStacked,
				onClickHandler,
				name,
				yAxisUnit,
				staticLine,
				onDragSelect,
			},
			[PANEL_TYPES.VALUE]: {
				title,
				data,
				yAxisUnit,
			},
			[PANEL_TYPES.TABLE]: { ...GRID_TABLE_CONFIG, data: panelData, query },
			[PANEL_TYPES.LIST]: null,
			[PANEL_TYPES.TRACE]: null,
			[PANEL_TYPES.EMPTY_WIDGET]: null,
		};

		return result;
	}, [
		data,
		isStacked,
		name,
		onClickHandler,
		onDragSelect,
		staticLine,
		title,
		yAxisUnit,
		panelData,
		query,
	]);

	const Component = PANEL_TYPES_COMPONENT_MAP[panelType] as FC<
		PropsTypePropsMap[typeof panelType]
	>;
	const componentProps = useMemo(() => currentProps[panelType], [
		panelType,
		currentProps,
	]);

	if (!Component || !componentProps) return null;

	// eslint-disable-next-line react/jsx-props-no-spreading
	return <Component {...componentProps} />;
}

export default memo(GridPanelSwitch);
