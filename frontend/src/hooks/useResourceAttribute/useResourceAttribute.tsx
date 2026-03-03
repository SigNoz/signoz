import {
	// eslint-disable-next-line no-restricted-imports
	useContext,
} from 'react';

import { ResourceContext } from './context';
import { IResourceAttributeProps } from './types';

const useResourceAttribute = (): IResourceAttributeProps =>
	useContext(ResourceContext);

export default useResourceAttribute;
