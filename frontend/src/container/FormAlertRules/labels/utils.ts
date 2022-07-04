
import { v4 as uuid } from 'uuid';

import { ILabelRecord, IOption } from './types';
import { Labels } from 'types/api/alerts/def';

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

export const prepareLabels = (recs: ILabelRecord[]): Labels => {
	const labels: Labels = {};

	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < recs.length; i++) {
		if (!hiddenLabels.includes(recs[i].key)) {
			labels[recs[i].key] = recs[i].value;
		}
	}
	return labels;
}