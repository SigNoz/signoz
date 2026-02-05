import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export const PREVIOUS_QUERY_KEY = 'previousQuery';

function getPreviousQueryFromStore(): Record<string, IBuilderQuery> {
	try {
		const raw = sessionStorage.getItem(PREVIOUS_QUERY_KEY);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writePreviousQueryToStore(store: Record<string, IBuilderQuery>): void {
	try {
		sessionStorage.setItem(PREVIOUS_QUERY_KEY, JSON.stringify(store));
	} catch {
		// ignore quota or serialization errors
	}
}

export const getQueryKey = ({
	queryName,
	dataSource,
	signalSource,
	panelType,
}: {
	queryName: string;
	dataSource: string;
	signalSource: string;
	panelType: string;
}): string => {
	const qn = queryName || '';
	const ds = dataSource || '';
	const ss = signalSource === 'meter' ? 'meter' : '';
	const pt = panelType || '';
	return `${qn}:${ds}:${ss}:${pt}`;
};

export const getPreviousQueryFromKey = (key: string): IBuilderQuery | null => {
	const previousQuery = getPreviousQueryFromStore();
	return previousQuery?.[key] ?? null;
};

export const saveAsPreviousQuery = (
	key: string,
	query: IBuilderQuery,
): void => {
	const previousQuery = getPreviousQueryFromStore();
	previousQuery[key] = query;
	writePreviousQueryToStore(previousQuery);
};

export const removeKeyFromPreviousQuery = (key: string): void => {
	const previousQuery = getPreviousQueryFromStore();
	delete previousQuery[key];
	writePreviousQueryToStore(previousQuery);
};

export const clearPreviousQuery = (): void => {
	try {
		sessionStorage.removeItem(PREVIOUS_QUERY_KEY);
	} catch {
		// no-op
	}
};
