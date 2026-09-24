import { ComponentType } from 'react';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';

import { createAuthZHOC, WithAuthZOptions } from './withAuthZ.utils';

export function withAuthZContent<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuardContent, 'withAuthZContent', Component, opts);
}
