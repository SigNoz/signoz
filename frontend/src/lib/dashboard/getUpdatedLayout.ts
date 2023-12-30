import { PANEL_TYPES } from 'constants/queryBuilder';
import { Layout } from 'react-grid-layout';

export const getUpdatedLayout = (layout?: Layout[]): Layout[] => {
	let widgetLayout = layout;

	// filter empty from i from i due to previous version of signoz
	widgetLayout = layout?.filter((i) => i.i !== 'empty');

	const seen = new Set();

	// filter duplicate i values
	widgetLayout = widgetLayout?.filter((i) => {
		const duplicate = seen.has(i.i);
		seen.add(i.i);
		return !duplicate;
	});

	// filter EMPTY_WIDGET from i due to previous version of signoz
	widgetLayout = widgetLayout?.filter((i) => i.i !== PANEL_TYPES.EMPTY_WIDGET);

	return widgetLayout || [];
};
