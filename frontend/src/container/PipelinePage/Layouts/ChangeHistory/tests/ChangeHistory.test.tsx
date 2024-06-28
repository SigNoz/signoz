import { render } from '@testing-library/react';
import { TestWrapper } from 'testUtils';

import ChangeHistory from '../index';
import { pipelineData, pipelineDataHistory } from './testUtils';

describe('ChangeHistory test', () => {
	it('should render changeHistory correctly', () => {
		const { getAllByText, getByText } = render(
			<TestWrapper>
				<ChangeHistory pipelineData={pipelineData} />,
			</TestWrapper>,
		);

		// change History table headers
		[
			'Version',
			'Deployment Stage',
			'Last Deploy Message',
			'Last Deployed Time',
			'Edited by',
		].forEach((text) => expect(getByText(text)).toBeInTheDocument());

		// table content
		expect(getAllByText('test-user').length).toBe(2);
		expect(getAllByText('Deployment was successful').length).toBe(2);
	});

	it('test deployment stage and icon based on history data', () => {
		const { getByText, container } = render(
			<TestWrapper>
				<ChangeHistory
					pipelineData={{
						...pipelineData,
						history: pipelineDataHistory,
					}}
				/>
			</TestWrapper>,
		);

		// assertion for different deployment stages
		expect(container.querySelector('[data-icon="loading"]')).toBeInTheDocument();
		expect(getByText('In Progress')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="exclamation-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Dirty')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="close-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Failed')).toBeInTheDocument();

		expect(
			container.querySelector('[data-icon="minus-circle"]'),
		).toBeInTheDocument();
		expect(getByText('Unknown')).toBeInTheDocument();

		expect(container.querySelectorAll('.ant-table-row').length).toBe(5);
	});
});
