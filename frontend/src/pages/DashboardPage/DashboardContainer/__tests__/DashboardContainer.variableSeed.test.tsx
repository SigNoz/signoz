import { useQuery } from 'react-query';
import type {
	DashboardtypesGettableDashboardV2DTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import { render, waitFor } from 'tests/test-utils';

import { dashboardResponse } from '../../stories/__story_mockdata__/dashboard';
import DashboardContainer from '../index';
import type { DashboardQuerySource } from '../store/slices/editContextSlice';
import { useDashboardStore } from '../store/useDashboardStore';

const QUERY_KEY = ['variable-seed-dashboard'];
const select = (
	response: GetDashboardV2200,
): DashboardtypesGettableDashboardV2DTO => response.data;
const SOURCE: DashboardQuerySource = { queryKey: QUERY_KEY, select };

function withOperationsVariable(): GetDashboardV2200 {
	const response = dashboardResponse({
		panels: 0,
		sectioned: false,
		variables: [],
		locked: false,
	});
	response.data.spec.variables = [
		{
			kind: 'ListVariable',
			spec: {
				name: 'ops',
				display: { name: 'ops' },
				allowMultiple: true,
				allowAllValue: false,
				sort: 'none',
				plugin: {
					kind: 'signoz/CustomVariable',
					spec: { customValue: 'overflow_operation' },
				},
			},
		},
	] as GetDashboardV2200['data']['spec']['variables'];
	return response;
}

function Host(): JSX.Element | null {
	const { data } = useQuery(QUERY_KEY, withOperationsVariable);
	if (!data) {
		return null;
	}
	return (
		<DashboardContainer
			dashboard={data.data}
			refetch={jest.fn()}
			source={SOURCE}
			readOnly
		/>
	);
}

describe('DashboardContainer variable seeding', () => {
	it('keeps custom-variable values a link seeds that the list does not offer', async () => {
		const seeded = ['overflow_operation', 'GET /cart', 'POST /checkout'];
		render(<Host />, undefined, {
			initialRoute: `/?variables=${encodeURIComponent(JSON.stringify({ ops: seeded }))}`,
		});

		// The selector's first auto-fill is scheduled for the next frame; let it run.
		await waitFor(() =>
			expect(
				useDashboardStore.getState().variableValues[
					useDashboardStore.getState().dashboardId
				]?.ops?.value,
			).toStrictEqual(seeded),
		);
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});

		expect(
			useDashboardStore.getState().variableValues[
				useDashboardStore.getState().dashboardId
			]?.ops?.value,
		).toStrictEqual(seeded);
	});
});
