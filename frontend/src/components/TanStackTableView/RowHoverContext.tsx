/* eslint-disable no-restricted-imports */
// Context is required here to pass zustand store to components
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useRef,
} from 'react';
/* eslint-enable no-restricted-imports */
import { createStore, StoreApi, useStore } from 'zustand';

type RowHoverState = {
	hoveredRowId: string | null;
	setHoveredRowId: (id: string | null) => void;
};

const createRowHoverStore = (): StoreApi<RowHoverState> =>
	createStore<RowHoverState>((set) => ({
		hoveredRowId: null,
		setHoveredRowId: (id: string | null): void => {
			set({ hoveredRowId: id });
		},
	}));

type RowHoverStore = StoreApi<RowHoverState>;

const RowHoverContext = createContext<RowHoverStore | null>(null);

export function RowHoverProvider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const storeRef = useRef<RowHoverStore | null>(null);
	if (!storeRef.current) {
		storeRef.current = createRowHoverStore();
	}
	return (
		<RowHoverContext.Provider value={storeRef.current}>
			{children}
		</RowHoverContext.Provider>
	);
}

// Default store for when provider is not available
const defaultStore = createRowHoverStore();

/**
 * Check if a specific row is hovered.
 * Only re-renders when THIS row's hover state changes.
 */
export const useIsRowHovered = (rowId: string): boolean => {
	const store = useContext(RowHoverContext);
	// Selector returns true only if this specific row is hovered
	const isHovered = useStore(
		store ?? defaultStore,
		(s) => s.hoveredRowId === rowId,
	);
	return store ? isHovered : false;
};

/**
 * Get a callback to set a row as hovered.
 * This callback is stable and doesn't cause re-renders.
 */
export const useSetRowHovered = (rowId: string): (() => void) => {
	const store = useContext(RowHoverContext);
	return useCallback(() => {
		if (store) {
			const current = store.getState().hoveredRowId;
			if (current !== rowId) {
				store.getState().setHoveredRowId(rowId);
			}
		}
	}, [store, rowId]);
};

export default RowHoverContext;
