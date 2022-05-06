/* eslint-disable no-restricted-syntax */
import { ChartData } from 'chart.js';

export const hasData = (data: ChartData): boolean => {
	const { datasets = [] } = data;
	let hasData = false;
	try {
		for (const dataset of datasets) {
			if (dataset.data.length > 0) {
				hasData = true;
				break;
			}
		}
	} catch (error) {
		console.error(error);
	}

	return hasData;
};
