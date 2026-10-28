// eslint-disable-next-line no-restricted-imports
import { createContext, type ReactNode } from 'react';

/** The tree `HostRouter` was last rendered with. */
export const HostedTreeContext = createContext<ReactNode>(null);
