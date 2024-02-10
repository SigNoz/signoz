import { Layout } from 'react-grid-layout';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];
