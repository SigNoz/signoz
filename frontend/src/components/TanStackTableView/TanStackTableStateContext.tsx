/* eslint-disable no-restricted-imports */
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
} from 'react';
/* eslint-enable no-restricted-imports */
import { VisibilityState } from '@tanstack/react-table';
import { createStore, StoreApi, useStore } from 'zustand';

const CLEAR_HOVER_DELAY_MS = 100;

type TableState = {
	// Hover state
	hoveredRowId: string | null;
	clearTimeoutId: ReturnType<typeof setTimeout> | null;
	setHoveredRowId: (id: string | null) => void;
	scheduleClearHover: (rowId: string) => void;

	// Loading state
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;

	// Infinite scroll mode - when enabled, cells don't show skeleton on load
	isInfiniteScrollMode: boolean;
	setIsInfiniteScrollMode: (enabled: boolean) => void;

	// Column visibility state
	columnVisibility: VisibilityState;
	setColumnVisibility: (visibility: VisibilityState) => void;
};

const createTableStateStore = (): StoreApi<TableState> =>
	createStore<TableState>((set, get) => ({
		// Hover state
		hoveredRowId: null,
		clearTimeoutId: null,
		setHoveredRowId: (id: string | null): void => {
			const { clearTimeoutId } = get();
			if (clearTimeoutId) {
				clearTimeout(clearTimeoutId);
				set({ clearTimeoutId: null });
			}
			set({ hoveredRowId: id });
		},
		scheduleClearHover: (rowId: string): void => {
			const { clearTimeoutId } = get();
			if (clearTimeoutId) {
				clearTimeout(clearTimeoutId);
			}
			const timeoutId = setTimeout(() => {
				const current = get().hoveredRowId;
				if (current === rowId) {
					set({ hoveredRowId: null, clearTimeoutId: null });
				}
			}, CLEAR_HOVER_DELAY_MS);
			set({ clearTimeoutId: timeoutId });
		},

		// Loading state
		isLoading: false,
		setIsLoading: (loading: boolean): void => {
			set({ isLoading: loading });
		},

		// Infinite scroll mode
		isInfiniteScrollMode: false,
		setIsInfiniteScrollMode: (enabled: boolean): void => {
			set({ isInfiniteScrollMode: enabled });
		},

		// Column visibility state
		columnVisibility: {},
		setColumnVisibility: (visibility: VisibilityState): void => {
			set({ columnVisibility: visibility });
		},
	}));

type TableStateStore = StoreApi<TableState>;

const TanStackTableStateContext = createContext<TableStateStore | null>(null);

export function TanStackTableStateProvider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const storeRef = useRef<TableStateStore | null>(null);
	if (!storeRef.current) {
		storeRef.current = createTableStateStore();
	}
	return (
		<TanStackTableStateContext.Provider value={storeRef.current}>
			{children}
		</TanStackTableStateContext.Provider>
	);
}

const defaultStore = createTableStateStore();

// Hover hooks
export const useIsRowHovered = (rowId: string): boolean => {
	const store = useContext(TanStackTableStateContext);
	const isHovered = useStore(
		store ?? defaultStore,
		(s) => s.hoveredRowId === rowId,
	);
	return store ? isHovered : false;
};

export const useSetRowHovered = (rowId: string): (() => void) => {
	const store = useContext(TanStackTableStateContext);
	return useCallback(() => {
		if (store) {
			const current = store.getState().hoveredRowId;
			if (current !== rowId) {
				store.getState().setHoveredRowId(rowId);
			}
		}
	}, [store, rowId]);
};

export const useClearRowHovered = (rowId: string): (() => void) => {
	const store = useContext(TanStackTableStateContext);
	return useCallback(() => {
		if (store) {
			store.getState().scheduleClearHover(rowId);
		}
	}, [store, rowId]);
};

// Loading hooks
export const useIsTableLoading = (): boolean => {
	const store = useContext(TanStackTableStateContext);
	return useStore(store ?? defaultStore, (s) => s.isLoading);
};

export const useSetTableLoading = (): ((loading: boolean) => void) => {
	const store = useContext(TanStackTableStateContext);
	return useCallback(
		(loading: boolean) => {
			if (store) {
				store.getState().setIsLoading(loading);
			}
		},
		[store],
	);
};

// Sync component to update loading state from props
export function TableLoadingSync({
	isLoading,
	isInfiniteScrollMode,
}: {
	isLoading: boolean;
	isInfiniteScrollMode: boolean;
}): null {
	const store = useContext(TanStackTableStateContext);

	// Sync on mount and when props change
	useEffect(() => {
		if (store) {
			store.getState().setIsLoading(isLoading);
			store.getState().setIsInfiniteScrollMode(isInfiniteScrollMode);
		}
	}, [isLoading, isInfiniteScrollMode, store]);

	return null;
}

// Hook to check if cells should show skeleton (loading but not infinite scroll mode)
export const useShouldShowCellSkeleton = (): boolean => {
	const store = useContext(TanStackTableStateContext);
	return useStore(
		store ?? defaultStore,
		(s) => s.isLoading && !s.isInfiniteScrollMode,
	);
};

// Column visibility hooks
export const useColumnVisibility = (): VisibilityState => {
	const store = useContext(TanStackTableStateContext);
	return useStore(store ?? defaultStore, (s) => s.columnVisibility);
};

export const useIsColumnVisible = (columnId: string): boolean => {
	const store = useContext(TanStackTableStateContext);
	return useStore(
		store ?? defaultStore,
		(s) => s.columnVisibility[columnId] !== false,
	);
};

export const useSetColumnVisibility = (): ((
	visibility: VisibilityState,
) => void) => {
	const store = useContext(TanStackTableStateContext);
	return useCallback(
		(visibility: VisibilityState) => {
			if (store) {
				store.getState().setColumnVisibility(visibility);
			}
		},
		[store],
	);
};

// Sync component to update column visibility from props
export function ColumnVisibilitySync({
	visibility,
}: {
	visibility: VisibilityState;
}): null {
	const setVisibility = useSetColumnVisibility();

	// Sync on mount and when visibility changes
	useEffect(() => {
		setVisibility(visibility);
	}, [visibility, setVisibility]);

	return null;
}

export default TanStackTableStateContext;
