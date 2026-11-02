import { navigate } from 'lib/router/navigation';

/** Returns the history singleton to the state a suite should start each test in. */
export function resetTestRoute(): void {
	navigate('/', { replace: true });
}
