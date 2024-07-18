/* eslint-disable sonarjs/no-duplicate-string */
import GeneralSettingsContainer from 'container/GeneralSettings/GeneralSettings';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';

import { generalSettingsProps } from './mock';

const tooltipText = /More details on how to set retention period/;

const types = [
	{
		testId: 'metrics-card',
		header: 'Metrics',
		modalTestId: 'metrics-modal',
	},
	{
		testId: 'traces-card',
		header: 'Traces',
		modalTestId: 'traces-modal',
	},
	{
		testId: 'logs-card',
		header: 'Logs',
		modalTestId: 'logs-modal',
	},
];

describe('General Settings Page', () => {
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

	it('should properly display the help icon', async () => {
		const helpIcon = screen.getByLabelText('question-circle');

		fireEvent.mouseOver(helpIcon);

		await waitFor(() => {
			const tooltip = screen.getByText(tooltipText);
			expect(tooltip).toBeInTheDocument();
		});
	});

	types.forEach(({ testId, header, modalTestId }) => {
		describe(`${header} Card`, () => {
			it(`should be able to find "${header}" as the header `, () => {
				expect(
					screen.getByRole('heading', {
						name: header,
					}),
				).toBeInTheDocument();
			});
			it(`should check if ${header} body is properly displayed`, () => {
				const sectionCard = screen.getByTestId(testId);

				const retentionFieldLabel = within(sectionCard).getByTestId(
					'retention-field-label',
				);
				expect(retentionFieldLabel).toBeInTheDocument();

				const retentionFieldInput = within(sectionCard).getByTestId(
					'retention-field-input',
				);
				expect(retentionFieldInput).toBeInTheDocument();

				const retentionFieldDropdown = within(sectionCard).getByTestId(
					'retention-field-dropdown',
				);
				expect(retentionFieldDropdown).toBeInTheDocument();
				const retentionSubmitButton = within(sectionCard).getByTestId(
					'retention-submit-button',
				);
				expect(retentionSubmitButton).toBeInTheDocument();
			});
			it('Should check if save button is disabled by default', () => {
				const sectionCard = screen.getByTestId(testId);
				const retentionSubmitButton = within(sectionCard).getByTestId(
					'retention-submit-button',
				);
				expect(retentionSubmitButton).toBeDisabled();
			});
			it('Should check if changing the value of the textbox enables the save button ', () => {
				const sectionCard = screen.getByTestId(testId);
				const retentionFieldInput = within(sectionCard).getByTestId(
					'retention-field-input',
				);

				const retentionSubmitButton = within(sectionCard).getByTestId(
					'retention-submit-button',
				);
				expect(retentionSubmitButton).toBeDisabled();
				act(() => {
					fireEvent.change(retentionFieldInput, { target: { value: '2' } });
				});
				expect(retentionSubmitButton).toBeEnabled();
			});
			it('Should check if "retention_null_value_error" is displayed if the value is not set ', async () => {
				const sectionCard = screen.getByTestId(testId);
				const retentionFieldInput = within(sectionCard).getByTestId(
					'retention-field-input',
				);

				act(() => {
					fireEvent.change(retentionFieldInput, { target: { value: 0 } });
				});

				expect(
					await screen.findByText('retention_null_value_error'),
				).toBeInTheDocument();
			});
			it('should display the modal when a value is provided and save is clicked', async () => {
				const sectionCard = screen.getByTestId(testId);

				const retentionFieldInput = within(sectionCard).getByTestId(
					'retention-field-input',
				);

				const retentionSubmitButton = within(sectionCard).getByTestId(
					'retention-submit-button',
				);
				act(() => {
					fireEvent.change(retentionFieldInput, { target: { value: 1 } });
					fireEvent.click(retentionSubmitButton);
				});

				const sectionModal = screen.getByTestId(modalTestId);

				expect(
					await within(sectionModal).findByText('retention_confirmation'),
				).toBeInTheDocument();
			});

			describe(`${header} Modal`, () => {
				let sectionModal: HTMLElement;
				beforeEach(() => {
					const sectionCard = screen.getByTestId(testId);

					const retentionFieldInput = within(sectionCard).getByTestId(
						'retention-field-input',
					);

					const retentionSubmitButton = within(sectionCard).getByTestId(
						'retention-submit-button',
					);
					act(() => {
						fireEvent.change(retentionFieldInput, { target: { value: 1 } });
						fireEvent.click(retentionSubmitButton);
					});

					sectionModal = screen.getByTestId(modalTestId);
				});

				it('Should check if the modal is properly displayed', async () => {
					expect(
						within(sectionModal).getByText('retention_confirmation'),
					).toBeInTheDocument();
					expect(
						within(sectionModal).getByText('retention_confirmation_description'),
					).toBeInTheDocument();
				});
			});
		});
	});
});
