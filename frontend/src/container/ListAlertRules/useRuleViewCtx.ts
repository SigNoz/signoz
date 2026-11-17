import { useMemo } from 'react';
import { useAppContext } from 'providers/App/App';

import type { RuleViewCtx } from './types';

export function useRuleViewCtx(): RuleViewCtx {
	const { user } = useAppContext();
	return useMemo(() => ({ userEmail: user.email }), [user.email]);
}
