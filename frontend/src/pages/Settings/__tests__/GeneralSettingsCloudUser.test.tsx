import GeneralSettingsContainer from 'container/GeneralSettings/GeneralSettings';
import { render, screen, within } from 'tests/test-utils';

import { generalSettingsProps } from './mock';

jest.mock('utils/app', () => {
	const app = jest.requireActual('utils/app');
	return {
		...app,
		isCloudUser: jest.fn(() => true),
	};
});

const types = [
	{
		testId: 'metrics-card',
		header: 'Metrics',
	},
	{
		testId: 'traces-card',
		header: 'Traces',
	},
	{
		testId: 'logs-card',
		header: 'Logs',
	},
];

describe('Cloud User General Settings', () => {
	beforeEach(() => {
		render(
			<GeneralSettingsContainer
				metricsTtlValuesPayload={generalSettingsProps.metricsTtlValuesPayload}
				tracesTtlValuesPayload={generalSettingsProps.tracesTtlValuesPayload}
				logsTtlValuesPayload={generalSettingsProps.logsTtlValuesPayload}
				getAvailableDiskPayload={generalSettingsProps.getAvailableDiskPayload}
				metricsTtlValuesRefetch={generalSettingsProps.metricsTtlValuesRefetch}
				tracesTtlValuesRefetch={generalSettingsProps.tracesTtlValuesRefetch}
				logsTtlValuesRefetch={generalSettingsProps.logsTtlValuesRefetch}
			/>,
		);
	});
	it('should display the cloud user info card', () => {
		const cloudUserCard = screen.getByTestId('cloud-user-info-card');
		expect(cloudUserCard).toBeInTheDocument();
	});
	types.forEach(({ testId, header }) => {
		it(`should check if value textbox and duration dropdown are disabled in the body of ${header}`, () => {
			const sectionCard = screen.getByTestId(testId);

			const retentionFieldInput = within(sectionCard).getByTestId(
				'retention-field-input',
			);
			expect(retentionFieldInput).toBeDisabled();

			const retentionFieldDropdown = within(sectionCard).getByTestId(
				'retention-field-dropdown',
			);
			expect(retentionFieldDropdown).toHaveClass('ant-select-disabled');
		});
	});
});
