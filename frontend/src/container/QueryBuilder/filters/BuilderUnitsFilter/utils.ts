import { dataTypeCategories } from 'container/NewWidget/RightContainer/dataFormatCategories';

export const getAllUnits = dataTypeCategories
	.filter((e) => e.name === 'Data')[0]
	.formats.map((format) => ({
		label: format.name,
		value: format.id,
	}));
