import { Form } from 'antd';
import { ChannelType } from 'container/CreateAlertChannels/config';
import { act, render, renderHook, screen } from 'tests/test-utils';

import FormAlertChannels from '..';

jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: jest.fn(() => <div>Mocked MarkdownRenderer</div>),
}));

describe('FormAlertChannels', () => {
	it('keeps the send resolved switch in sync when the value arrives after mount', () => {
		const {
			result: {
				current: [formInstance],
			},
		} = renderHook(() => Form.useForm());
		render(
			<FormAlertChannels
				formInstance={formInstance}
				type={ChannelType.Slack}
				setSelectedConfig={jest.fn()}
				onTypeChangeHandler={jest.fn()}
				onSaveHandler={jest.fn()}
				onTestHandler={jest.fn()}
				testingState={false}
				savingState={false}
				title="Edit"
				initialValue={{ name: 'Dummy-Channel', type: ChannelType.Slack }}
				editing
			/>,
		);
		const sendResolvedSwitch = screen.getByTestId('field-send-resolved-checkbox');
		expect(sendResolvedSwitch).not.toBeChecked();

		act(() => {
			formInstance.setFieldsValue({ send_resolved: true });
		});

		expect(sendResolvedSwitch).toBeChecked();
	});
});
