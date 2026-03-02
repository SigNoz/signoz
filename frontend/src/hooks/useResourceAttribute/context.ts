import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
} from 'react';

import { IResourceAttributeProps } from './types';

export const ResourceContext = createContext<IResourceAttributeProps>(
	{} as IResourceAttributeProps,
);
