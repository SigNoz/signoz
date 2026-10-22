import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';

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

const DEFAULT_COLUMNS: DashboardDynamicColumns = {
	createdAt: true,
	createdBy: true,
	updatedAt: false,
	updatedBy: false,
};

interface DashboardsListVisibleColumnsState {
	visibleColumns: DashboardDynamicColumns;
	setVisibleColumns: (next: DashboardDynamicColumns) => void;
}

export const useDashboardsListVisibleColumnsStore =
	create<DashboardsListVisibleColumnsState>()(
		persist(
			(set) => ({
				visibleColumns: DEFAULT_COLUMNS,
				setVisibleColumns: (next): void => {
					set({ visibleColumns: next });
				},
			}),
			{
				name: LOCALSTORAGE.DASHBOARDS_LIST_VISIBLE_COLUMNS,
				merge: (persisted, current) => ({
					...current,
					visibleColumns: {
						...DEFAULT_COLUMNS,
						...((persisted as Partial<DashboardsListVisibleColumnsState>)
							?.visibleColumns ?? {}),
					},
				}),
			},
		),
	);
