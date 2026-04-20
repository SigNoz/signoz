import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IEntityColumn {
	label: string;
	value: string;
	id: string;
	defaultVisibility: boolean;
	canBeHidden: boolean;
	behavior: 'hidden-on-expand' | 'hidden-on-collapse' | 'always-visible';
}

export interface IInfraMonitoringTableColumnsStore {
	columns: Record<string, IEntityColumn[]>;
	columnsHidden: Record<string, string[]>;
	addColumn: (page: string, columnId: string) => void;
	removeColumn: (page: string, columnId: string) => void;
	initializePageColumns: (page: string, columns: IEntityColumn[]) => void;
}

export const useInfraMonitoringTableColumnsStore = create<IInfraMonitoringTableColumnsStore>()(
	persist(
		(set, get) => ({
			columns: {},
			columnsHidden: {},
			addColumn: (page, columnId): void => {
				const state = get();
				const columnDefinition = state.columns[page]?.find(
					(c) => c.id === columnId,
				);

				if (!columnDefinition) {
					return;
				}

				if (!columnDefinition.canBeHidden) {
					return;
				}

				const columnsHidden = state.columnsHidden[page];

				if (columnsHidden.includes(columnId)) {
					set({
						columnsHidden: {
							...state.columnsHidden,
							[page]: columnsHidden.filter((id) => id !== columnId),
						},
					});
				}
			},
			removeColumn: (page, columnId): void => {
				const state = get();
				const columnDefinition = state.columns[page]?.find(
					(c) => c.id === columnId,
				);

				if (!columnDefinition) {
					return;
				}

				if (!columnDefinition.canBeHidden) {
					return;
				}

				const columnsHidden = state.columnsHidden[page];

				if (!columnsHidden.includes(columnId)) {
					set({
						columnsHidden: {
							...state.columnsHidden,
							[page]: [...columnsHidden, columnId],
						},
					});
				}
			},
			initializePageColumns: (page, columns): void => {
				const state = get();

				set({
					columns: {
						...state.columns,
						[page]: columns,
					},
				});

				if (state.columnsHidden[page] === undefined) {
					set({
						columnsHidden: {
							...state.columnsHidden,
							[page]: columns
								.filter((c) => c.defaultVisibility === false)
								.map((c) => c.id),
						},
					});
				}
			},
		}),
		{
			name: '@signoz/infra-monitoring-columns',
		},
	),
);

export const useInfraMonitoringTableColumnsForPage = (
	page: string,
): [columns: IEntityColumn[], columnsHidden: string[]] => {
	const state = useInfraMonitoringTableColumnsStore((s) => s.columns);
	const columnsHidden = useInfraMonitoringTableColumnsStore(
		(s) => s.columnsHidden,
	);

	return [state[page] ?? [], columnsHidden[page] ?? []];
};
