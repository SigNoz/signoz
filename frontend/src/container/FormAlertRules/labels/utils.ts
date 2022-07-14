import { Labels } from 'types/api/alerts/def';

import { ILabelRecord } from './types';

const hiddenLabels = ['severity', 'description'];

export const createQuery = (
	selectedItems: Array<string | string[]> = [],
): ILabelRecord | null => {
	if (selectedItems.length === 2) {
		return {
			key: selectedItems[0] as string,
			value: selectedItems[1] as string,
		};
	}
	return null;
};

export const flattenLabels = (labels: Labels): ILabelRecord[] => {
	const recs: ILabelRecord[] = [];

	Object.keys(labels).forEach((key) => {
		if (!hiddenLabels.includes(key)) {
			recs.push({
				key,
				value: labels[key],
			});
		}
	});

	return recs;
};

export const prepareLabels = (
	recs: ILabelRecord[],
	alertLabels: Labels | undefined,
): Labels => {
	const labels: Labels = {};

	recs.forEach((rec) => {
		if (!hiddenLabels.includes(rec.key)) {
			labels[rec.key] = rec.value;
		}
	});
	if (alertLabels) {
		Object.keys(alertLabels).forEach((key) => {
			if (hiddenLabels.includes(key)) {
				labels[key] = alertLabels[key];
			}
		});
	}

	return labels;
};
