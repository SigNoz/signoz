// eslint-disable-next-line no-restricted-imports
import { createContext, useContext } from 'react';

const RowHoverContext = createContext(false);

export const useRowHover = (): boolean => useContext(RowHoverContext);

export default RowHoverContext;
