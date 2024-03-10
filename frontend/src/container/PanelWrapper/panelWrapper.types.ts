import { WidgetGraphComponentProps } from 'container/GridCardLayout/GridCard/types';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { Dispatch, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export type PanelWrapperProps = {
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	widget: Widgets;
	setRequestData?: WidgetGraphComponentProps['setRequestData'];
	isFullViewMode?: boolean;
	onToggleModelHandler?: () => void;
	graphVisibility?: boolean[];
	setGraphVisibility?: Dispatch<SetStateAction<boolean[]>>;
	onClickHandler?: OnClickPluginOpts['onClick'];
	onDragSelect: (start: number, end: number) => void;
};
