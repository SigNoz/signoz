import { VirtuosoMockContext } from 'react-virtuoso';
import ListAlertRules from 'container/ListAlertRules';
import { render, screen } from 'tests/test-utils';

const NUQS_FLUSH_MS = 100;

interface RenderOptions {
	role?: string;
	initialRoute?: string;
}

export function renderListAlertRules(
	options: RenderOptions = {},
): ReturnType<typeof render> {
	const { role, initialRoute = '/' } = options;
	window.history.replaceState({}, '', initialRoute);
	return render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 46 }}>
			<ListAlertRules />
		</VirtuosoMockContext.Provider>,
		undefined,
		role !== undefined ? { role, initialRoute } : { initialRoute },
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
	window.history.replaceState({}, '', '/');
}

export async function findAlertRow(alertName: string): Promise<HTMLElement> {
	const cell = await screen.findByText(alertName, {}, { timeout: 5000 });
	const row = cell.closest('tr');
	if (!row) {
		throw new Error(`Row not found for alert "${alertName}"`);
	}
	return row as HTMLElement;
}
