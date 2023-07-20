import { PANEL_TYPES_COMPONENT_MAP } from 'constants/panelTypes';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FC, memo, useMemo } from 'react';

import { GridPanelSwitchProps, PropsTypePropsMap } from './types';

function GridPanelSwitch({
	panelType,
	data,
	title,
	opacity,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
}: GridPanelSwitchProps): JSX.Element | null {
	const currentProps: PropsTypePropsMap = useMemo(() => {
		const result: PropsTypePropsMap = {
			[PANEL_TYPES.TIME_SERIES]: {
				data,
				title,
				opacity,
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
			[PANEL_TYPES.TABLE]: null,
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
		opacity,
		staticLine,
		title,
		yAxisUnit,
	]);

	const Component = PANEL_TYPES_COMPONENT_MAP[panelType] as FC<
		PropsTypePropsMap[typeof panelType]
	>;
	const componentProps = currentProps[panelType];

	if (!Component || !componentProps) return null;

	// eslint-disable-next-line react/jsx-props-no-spreading
	return <Component {...componentProps} />;
}

export default memo(GridPanelSwitch);
