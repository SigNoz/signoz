import { Dashboard, DashboardTemplate } from 'types/api/dashboard/getAll';

// `Dashboard['data']['tags']` is typed as `string[]`, but some backend versions
// report tags as `{key, value}` objects instead (the shape the newer key/value
// tag model uses) — that mismatch isn't caught by the type system since API
// responses are cast, not runtime-validated. Normalize defensively so a
// non-string tag degrades to a label instead of throwing at `.toLowerCase()`.
const tagToString = (tag: unknown): string => {
	if (typeof tag === 'string') {
		return tag;
	}
	if (tag && typeof tag === 'object' && 'key' in tag) {
		const { key, value } = tag as { key: string; value?: string };
		return value ? `${key}:${value}` : key;
	}
	return String(tag);
};

export const filterDashboards = (
	searchValue: string,
	dashboardList: Dashboard[],
): Dashboard[] => {
	const searchValueLowerCase = searchValue?.toLowerCase();

	// Filter by title, description, tags
	return dashboardList.filter((item: Dashboard) => {
		const { title, description, tags } = item.data;
		const itemValuesNew = [title, description];

		if (tags && tags.length > 0) {
			itemValuesNew.push(...tags.map(tagToString));
		}

		// Check if any property value contains the searchValue
		return itemValuesNew.some((value) => {
			if (value) {
				return value.toLowerCase().includes(searchValueLowerCase);
			}

			return false;
		});
	});
};

export const filterTemplates = (
	searchValue: string,
	dashboardList: DashboardTemplate[],
): DashboardTemplate[] => {
	const searchValueLowerCase = searchValue?.toLowerCase();

	return dashboardList.filter((item: DashboardTemplate) => {
		const { name } = item;

		// Check if any property value contains the searchValue
		return name.toLowerCase().includes(searchValueLowerCase);
	});
};

export interface DashboardDynamicColumns {
	createdAt: boolean;
	createdBy: boolean;
	updatedAt: boolean;
	updatedBy: boolean;
}

export enum DynamicColumns {
	CREATED_AT = 'createdAt',
	CREATED_BY = 'createdBy',
	UPDATED_AT = 'updatedAt',
	UPDATED_BY = 'updatedBy',
}
