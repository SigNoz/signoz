import { render, screen } from 'tests/test-utils';

import ServiceOverview from '../Overview/ServiceOverview';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): {
		servicename: string;
	} => ({ servicename: 'mockServiceName' }),
}));

jest.mock('hooks/useFeatureFlag', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({
		active: false,
	}),
}));

describe('ServiceOverview', () => {
	test('Should render the component', () => {
		render(
			<ServiceOverview
				onDragSelect={jest.fn()}
				handleGraphClick={jest.fn()}
				selectedTimeStamp={0}
				selectedTraceTags="test"
				topLevelOperationsLoading
				topLevelOperationsRoute={['TestGET', 'TestGET frontpage']}
			/>,
		);

		const loadingText = screen.getByText(/loading/i);
		expect(loadingText).toBeInTheDocument();
	});
});
