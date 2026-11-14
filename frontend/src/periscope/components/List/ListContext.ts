// eslint-disable-next-line no-restricted-imports -- mirrors antd's component-scoped ListContext, not shared state
import { createContext } from 'react';

import type { ListContextValue } from './types';

const ListContext = createContext<ListContextValue>({});

export default ListContext;
