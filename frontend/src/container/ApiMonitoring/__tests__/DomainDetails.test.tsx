import { useApiMonitoringParams } from 'container/ApiMonitoring/queryParams';
import { render, screen } from 'tests/test-utils';

import { VIEWS } from '../Explorer/Domains/DomainDetails/constants';
import DomainDetails from '../Explorer/Domains/DomainDetails/DomainDetails';

jest.mock('container/ApiMonitoring/queryParams', () => ({
	...jest.requireActual('container/ApiMonitoring/queryParams'),
	useApiMonitoringParams: jest.fn(),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('../Explorer/Domains/DomainDetails/components/DomainMetrics', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('../Explorer/Domains/DomainDetails/EndPointDetails', () => {
	const { useInitialExpression } = jest.requireActual(
		'components/QueryBuilderV2',
	);
	return {
		__esModule: true,
		default: function MockEndPointDetails(): JSX.Element {
			return (
				<span data-testid="endpoint-stats-scope">{useInitialExpression()}</span>
			);
		},
	};
});

describe('DomainDetails', () => {
	it('scopes Endpoint Stats to the domain and the picked endpoint', () => {
		jest
			.mocked(useApiMonitoringParams)
			.mockReturnValue([
				{ selectedView: VIEWS.ENDPOINT_STATS, selectedEndPointName: '/v1/charges' },
				jest.fn(),
			]);

		render(
			<DomainDetails
				domainData={{ domainName: 'api.example.com' }}
				handleClose={jest.fn()}
				selectedDomainIndex={0}
				setSelectedDomainIndex={jest.fn()}
				domainListLength={1}
				domainListFilterExpression=""
			/>,
		);

		expect(screen.getByTestId('endpoint-stats-scope')).toHaveTextContent(
			"kind_string = 'Client' AND http_host = 'api.example.com' AND http_url = '/v1/charges'",
		);
	});
});
