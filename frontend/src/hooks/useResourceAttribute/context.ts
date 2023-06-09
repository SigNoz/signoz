import { createContext } from 'react';

import { IResourceAttributeProps } from './types';

export const ResourceContext = createContext<IResourceAttributeProps>(
	{} as IResourceAttributeProps,
);
