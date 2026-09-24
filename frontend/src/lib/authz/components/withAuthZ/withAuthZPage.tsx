import { ComponentType } from 'react';
import { AuthZGuardPage } from 'lib/authz/components/AuthZGuard/AuthZGuardPage';

import { createAuthZHOC, WithAuthZOptions } from './withAuthZ.utils';

export function withAuthZPage<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuardPage, 'withAuthZPage', Component, opts);
}
