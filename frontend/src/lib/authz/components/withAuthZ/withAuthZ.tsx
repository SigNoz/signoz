import type { ComponentType } from 'react';
import { AuthZGuard } from 'lib/authz/components/AuthZGuard/AuthZGuard';

import type { WithAuthZOptions } from './withAuthZ.utils';
import { createAuthZHOC } from './withAuthZ.utils';

export type { RouterContext, WithAuthZOptions } from './withAuthZ.utils';

export function withAuthZ<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuard, 'withAuthZ', Component, opts);
}
