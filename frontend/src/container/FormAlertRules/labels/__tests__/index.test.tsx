import { fireEvent, render, screen } from '@testing-library/react';
import { message } from 'antd';

import LabelSelect from '../index';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: {
			builder: {
				queryData: [{ groupBy: [{ key: 'service.name' }] }],
			},
		},
	}),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('react-i18next', () => ({
	useTranslation: (): { t: (key: string, opts?: unknown) => string } => ({
		t: (key: string): string => key,
	}),
}));

describe('LabelSelect', () => {
	let onSetLabels: jest.Mock;
	let messageErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		onSetLabels = jest.fn();
		messageErrorSpy = jest.spyOn(message, 'error').mockImplementation(jest.fn());
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function enterLabelKey(key: string): HTMLElement {
		const input = screen.getByRole('textbox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: key } });
		fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });
		return input;
	}

	it('rejects a label key that matches a query group by attribute', () => {
		render(<LabelSelect onSetLabels={onSetLabels} initialValues={undefined} />);

		const input = enterLabelKey('service.name');

		expect(messageErrorSpy).toHaveBeenCalledWith('label_group_by_conflict');
		expect(onSetLabels).not.toHaveBeenCalled();
		// key is not staged; input still holds the rejected value
		expect(input).toHaveValue('service.name');
	});

	it('accepts a label key that does not conflict with group by', () => {
		render(<LabelSelect onSetLabels={onSetLabels} initialValues={undefined} />);

		const input = enterLabelKey('team');

		expect(messageErrorSpy).not.toHaveBeenCalled();
		// key staged, input cleared for value entry
		expect(input).toHaveValue('');

		fireEvent.change(input, { target: { value: 'platform' } });
		fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });

		expect(onSetLabels).toHaveBeenCalledWith(
			expect.objectContaining({ team: 'platform' }),
		);
	});
});
