import { useMemo } from 'react';
import { useAppContext } from 'providers/App/App';

import type { RuleViewCtx } from './types';
import { useAlertRuleViewsStore } from './useAlertRuleViewsStore';

export function useRuleViewCtx(): RuleViewCtx {
	const { user } = useAppContext();
	const recent = useAlertRuleViewsStore((s) => s.recent);
	return useMemo(
		() => ({ userEmail: user.email, recent }),
		[user.email, recent],
	);
}
