// eslint-disable-next-line no-restricted-imports
import { useContext } from 'react';

import { HostedTreeContext } from './HostedTreeContext';

export function HostedTreeOutlet(): JSX.Element {
	return <>{useContext(HostedTreeContext)}</>;
}
