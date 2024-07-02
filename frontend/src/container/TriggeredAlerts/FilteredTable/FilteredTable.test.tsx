// FilteredTable.test.tsx

import { render } from 'tests/test-utils';
import { Alerts } from 'types/api/alerts/getTriggered';

import FilteredTable from '.';

describe('FilteredTable component', () => {
	const selectedGroup = [{ value: 'group1' }, { value: 'group2' }];
	const allAlerts: Alerts[] = [
		{
			labels: { group1: 'value1', group2: 'value2' },
			annotations: { description: 'Description 1', summary: 'Summary 1' },
			state: 'active',
			name: 'Alert 1',
			id: 1,
			endsAt: '2023-12-05T12:00:00Z',
			fingerprint: 'fingerprint1',
			generatorURL: 'generatorURL1',
			receivers: [],
			startsAt: '2023-12-05T11:00:00Z',
			status: { inhibitedBy: [], silencedBy: [], state: 'active' },
			updatedAt: '2023-12-05T11:30:00Z',
		},
	];
	const selectedFilter = [{ value: 'severity:critical' }];

	it('should render table headers', () => {
		const { getByText } = render(
			<FilteredTable
				selectedGroup={selectedGroup}
				allAlerts={allAlerts}
				selectedFilter={selectedFilter}
			/>,
		);

		// Assert that each header is present
		expect(getByText('Status')).toBeInTheDocument();
		expect(getByText('Alert Name')).toBeInTheDocument();
		expect(getByText('Severity')).toBeInTheDocument();
		expect(getByText('Firing Since')).toBeInTheDocument();
		expect(getByText('Tags')).toBeInTheDocument();
	});
});
