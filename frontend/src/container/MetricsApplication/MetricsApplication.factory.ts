import { Widgets } from 'types/api/dashboard/getAll';
import { v4 } from 'uuid';

import { GetWidgetQueryBuilderProps } from './types';

export const getWidgetQueryBuilder = ({
	query,
	title = '',
	panelTypes,
	yAxisUnit = '',
	fillSpans = false,
	id,
	columnUnits,
}: GetWidgetQueryBuilderProps): Widgets => ({
	description: '',
	id: id || v4(),
	isStacked: false,
	nullZeroValues: '',
	opacity: '0',
	panelTypes,
	query,
	timePreferance: 'GLOBAL_TIME',
	title,
	yAxisUnit,
	softMax: null,
	softMin: null,
	selectedLogFields: [],
	selectedTracesFields: [],
	fillSpans,
	columnUnits,
});
