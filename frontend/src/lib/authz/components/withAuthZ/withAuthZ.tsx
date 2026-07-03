import { ComponentType } from 'react';
import { AuthZGuard } from 'lib/authz/components/AuthZGuard/AuthZGuard';

import { createAuthZHOC, WithAuthZOptions } from './withAuthZ.utils';

export type { RouterContext, WithAuthZOptions } from './withAuthZ.utils';

export function withAuthZ<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuard, 'withAuthZ', Component, opts);
}
