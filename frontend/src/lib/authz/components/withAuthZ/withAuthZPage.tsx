import type { ComponentType } from 'react';
import { AuthZGuardPage } from 'lib/authz/components/AuthZGuard/AuthZGuardPage';

import type { WithAuthZOptions } from './withAuthZ.utils';
import { createAuthZHOC } from './withAuthZ.utils';

export function withAuthZPage<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuardPage, 'withAuthZPage', Component, opts);
}
