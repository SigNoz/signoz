// eslint-disable-next-line no-restricted-imports
import { createContext, useContext } from 'react';

export type AIAssistantVariant = 'panel' | 'page' | 'modal';

export const VariantContext = createContext<AIAssistantVariant>('page');

export const useVariant = (): AIAssistantVariant => useContext(VariantContext);
