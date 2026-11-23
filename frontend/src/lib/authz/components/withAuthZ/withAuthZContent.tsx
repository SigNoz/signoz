import type { ComponentType } from 'react';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';

import type { WithAuthZOptions } from './withAuthZ.utils';
import { createAuthZHOC } from './withAuthZ.utils';

export function withAuthZContent<P extends object>(
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	return createAuthZHOC(AuthZGuardContent, 'withAuthZContent', Component, opts);
}
