import { QueryClient } from 'react-query';

/**
 * One client per story: retries off so a deliberately failing handler renders
 * its error state immediately, and no cache carried over between stories.
 */
export const createStorybookQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});
