import { screen, waitFor } from '@testing-library/react';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	forbidFieldsValuesAPI,
	mockAIObservabilityFieldsValuesAPI,
	mockFieldsValuesAPI,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

setupServer();

describe('CheckboxFilterV2 - AI observability routing', () => {
	it('reads values from the AI observability endpoint and never the signal-wide one', async () => {
		const aiEndpoint = mockAIObservabilityFieldsValuesAPI({
			stringValues: ['openai', 'anthropic'],
		});
		const fieldsEndpoint = forbidFieldsValuesAPI();

		render(
			<CheckboxFilterV2
				filter={DEFAULT_FILTER}
				source={QuickFiltersSource.AI_OBSERVABILITY}
				useFieldApis={DEFAULT_USE_FIELD_APIS}
			/>,
		);

		await expect(screen.findByText('openai')).resolves.toBeInTheDocument();
		expect(screen.getByText('anthropic')).toBeInTheDocument();
		expect(fieldsEndpoint.called).toBe(false);
		expect(aiEndpoint.requests).toHaveLength(1);
	});

	it('forwards the filter key and the time range to the AI observability endpoint', async () => {
		const aiEndpoint = mockAIObservabilityFieldsValuesAPI({
			stringValues: ['openai'],
		});

		render(
			<CheckboxFilterV2
				filter={DEFAULT_FILTER}
				source={QuickFiltersSource.AI_OBSERVABILITY}
				useFieldApis={DEFAULT_USE_FIELD_APIS}
			/>,
		);

		await screen.findByText('openai');

		const params = aiEndpoint.requests[0];
		expect(params.get('name')).toBe(DEFAULT_FILTER.attributeKey.key);
		expect(params.get('startUnixMilli')).toBe(
			String(DEFAULT_USE_FIELD_APIS.startUnixMilli),
		);
		expect(params.get('endUnixMilli')).toBe(
			String(DEFAULT_USE_FIELD_APIS.endUnixMilli),
		);
	});

	it('keeps non-AI sources on the signal-wide endpoint', async () => {
		mockFieldsValuesAPI({ stringValues: ['production'] });
		const aiEndpoint = mockAIObservabilityFieldsValuesAPI({
			stringValues: ['should-not-be-used'],
		});

		render(
			<CheckboxFilterV2
				filter={DEFAULT_FILTER}
				source={QuickFiltersSource.TRACES_EXPLORER}
				useFieldApis={DEFAULT_USE_FIELD_APIS}
			/>,
		);

		await expect(screen.findByText('production')).resolves.toBeInTheDocument();
		await waitFor(() => expect(aiEndpoint.requests).toHaveLength(0));
	});
});
