import { useQuery } from 'react-query';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import { render, screen, waitFor } from 'tests/test-utils';

import { dashboardResponse } from '../../stories/__story_mockdata__/dashboard';
import { DEFAULT_CONTROLS } from '../controls/dashboardControls';
import type { DashboardControlsInput } from '../controls/types';
import DashboardContainer from '../index';
import type { DashboardQuerySource } from '../store/slices/editContextSlice';

const QUERY_KEY = ['lockdown-dashboard'];

const ALL_CONTROLS_OFF = Object.fromEntries(
	Object.keys(DEFAULT_CONTROLS).map((group) => [group, false]),
) as DashboardControlsInput;

const select = (
	response: GetDashboardV2200,
): DashboardtypesGettableDashboardV2DTO => response.data;
const SOURCE: DashboardQuerySource = { queryKey: QUERY_KEY, select };

/**
 * Interactive elements a host can't turn off: they read, never write, and the
 * page is unusable without them. Anything else here must be a control.
 */
const ALLOWED_TEST_ID_PREFIXES = [
	// Collapses a section in this browser only; it also carries the section title.
	'dashboard-section-toggle-',
];

const INTERACTIVE =
	'button, a[href], input, select, textarea, [role="button"], [role="menuitem"], [role="combobox"], [role="switch"], [role="checkbox"]';

function LockdownHost(): JSX.Element | null {
	const { data } = useQuery(QUERY_KEY, () =>
		dashboardResponse({
			panels: 3,
			sectioned: true,
			variables: ['custom'],
			locked: false,
		}),
	);
	if (!data) {
		return null;
	}
	return (
		<DashboardContainer
			dashboard={data.data}
			refetch={jest.fn()}
			source={SOURCE}
			readOnly
			controls={ALL_CONTROLS_OFF}
		/>
	);
}

function visibleInteractive(): Element[] {
	return Array.from(document.body.querySelectorAll(INTERACTIVE)).filter(
		(element) => !element.closest('[hidden]'),
	);
}

function describeElement(element: Element): string {
	return (
		element.getAttribute('data-testid') ??
		`<${element.tagName.toLowerCase()} aria-label="${element.getAttribute('aria-label') ?? ''}">${element.textContent?.trim().slice(0, 40) ?? ''}`
	);
}

describe('DashboardContainer lockdown', () => {
	// A control a host can't switch off, or one read-only doesn't remove, fails here.
	it('renders nothing interactive with every control off on a read-only mount', async () => {
		render(<LockdownHost />);

		await waitFor(() =>
			expect(screen.getAllByTestId(/^panel-/).length).toBeGreaterThan(0),
		);

		const leaked = visibleInteractive()
			.map(describeElement)
			.filter(
				(id) => !ALLOWED_TEST_ID_PREFIXES.some((prefix) => id.startsWith(prefix)),
			);

		expect(leaked).toStrictEqual([]);
	});
});
