import { useMemo } from 'react';
import { useAppContext } from 'providers/App/App';

import { useDashboardViewsStore } from '../store/useDashboardViewsStore';
import type { DashboardViewCtx } from '../types';

export function useDashboardViewCtx(): DashboardViewCtx {
	const { user } = useAppContext();
	const recent = useDashboardViewsStore((s) => s.recent);
	return useMemo(
		() => ({ userEmail: user.email, recent }),
		[user.email, recent],
	);
}
