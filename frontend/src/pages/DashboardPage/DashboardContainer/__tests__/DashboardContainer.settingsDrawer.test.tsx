import { useQuery } from 'react-query';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import { act, render, screen } from 'tests/test-utils';

import { dashboardResponse } from '../../stories/__story_mockdata__/dashboard';
import DashboardContainer from '../index';
import type { DashboardQuerySource } from '../store/slices/editContextSlice';
import { useDashboardStore } from '../store/useDashboardStore';

jest.mock('../DashboardSettings', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="dashboard-settings" />,
}));

const QUERY_KEY = ['settings-drawer-dashboard'];
const select = (
	response: GetDashboardV2200,
): DashboardtypesGettableDashboardV2DTO => response.data;
const SOURCE: DashboardQuerySource = { queryKey: QUERY_KEY, select };

function Host(): JSX.Element | null {
	const { data } = useQuery(QUERY_KEY, () =>
		dashboardResponse({
			panels: 0,
			sectioned: false,
			variables: [],
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
			controls={{ dashboardActions: false }}
		/>
	);
}

describe('DashboardContainer settings drawer', () => {
	it('opens on request when the host hides the dashboard actions', async () => {
		render(<Host />);
		await screen.findByTestId('dashboard-empty-state');

		act(() => {
			useDashboardStore
				.getState()
				.requestSettings({ tab: 'Variables', addVariable: true });
		});

		await expect(
			screen.findByTestId('dashboard-settings'),
		).resolves.toBeInTheDocument();
	});
});
