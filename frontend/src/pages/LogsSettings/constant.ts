import { TFunction } from 'i18next';

export const TABS_KEY = {
	LOGS_INDEX_FIELDS: 'LOGS_INDEX_FIELDS',
	LOGS_PIPELINE: 'LOGS_PIPELINE',
};

export const TABS_TITLE = (t: TFunction): Record<string, string> => ({
	[TABS_KEY.LOGS_INDEX_FIELDS]: t('routes.index_fields'),
	[TABS_KEY.LOGS_PIPELINE]: t('routes.pipeline'),
});
