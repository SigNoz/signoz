import { useForm } from 'react-hook-form';
import {
	ChannelFormValues,
	ChannelKind,
} from 'container/CreateAlertChannels/types';
import { act, render, renderHook, screen } from 'tests/test-utils';

import FormAlertChannels from '..';

jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: jest.fn(() => <div>Mocked MarkdownRenderer</div>),
}));

describe('FormAlertChannels', () => {
	it('keeps the send resolved switch in sync when the value arrives after mount', () => {
		const { result } = renderHook(() =>
			useForm<ChannelFormValues>({ defaultValues: { name: 'Dummy-Channel' } }),
		);

		render(
			<FormAlertChannels
				form={result.current}
				type={ChannelKind.slack}
				onTypeChangeHandler={jest.fn()}
				onSaveHandler={jest.fn()}
				onTestHandler={jest.fn()}
				onDiscardHandler={jest.fn()}
				testingState={false}
				savingState={false}
				editing
			/>,
		);

		const sendResolvedSwitch = screen.getByTestId('field-send-resolved-checkbox');
		expect(sendResolvedSwitch).not.toBeChecked();

		act(() => {
			result.current.setValue('sendResolved', true);
		});

		expect(sendResolvedSwitch).toBeChecked();
	});
});
