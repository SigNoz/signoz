import { VirtuosoMockContext } from 'react-virtuoso';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { render } from 'tests/test-utils';

const NUQS_FLUSH_MS = 100;

interface RenderOptions {
	initialRoute?: string;
}

export function renderTriggeredAlerts(
	options: RenderOptions = {},
): ReturnType<typeof render> {
	const { initialRoute = '/' } = options;
	window.history.replaceState(null, '', initialRoute);
	return render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 46 }}>
			<TriggeredAlerts />
		</VirtuosoMockContext.Provider>,
		undefined,
		{ initialRoute },
	);
}

// nuqs schedules URL writes through a throttle/debounce. Tests that mutate
// query state must flush pending writes before resetting the URL, otherwise
// a queued write can leak into the next test.
export async function flushNuqsUrl(): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, NUQS_FLUSH_MS);
	});
}

export function resetUrl(): void {
	window.history.replaceState(null, '', '/');
}
