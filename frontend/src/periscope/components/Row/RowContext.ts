// eslint-disable-next-line no-restricted-imports -- mirrors antd's component-scoped RowContext, not shared state
import { createContext } from 'react';

export interface RowContextState {
	gutter?: [number, number];
	wrap?: boolean;
}

const RowContext = createContext<RowContextState>({});

export default RowContext;
