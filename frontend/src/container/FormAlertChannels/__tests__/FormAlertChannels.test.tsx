import { useForm } from 'react-hook-form';
import { ChannelInitialConfig } from 'container/CreateAlertChannels/defaults';
import {
	ChannelFormValues,
	ChannelKind,
	JiraDeployment,
	WebhookAuth,
} from 'container/CreateAlertChannels/types';
import { act, render, renderHook, screen } from 'tests/test-utils';

import FormAlertChannels from '..';

jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: jest.fn(() => <div>Mocked MarkdownRenderer</div>),
}));

// aria-hidden inputs only mirror a custom control's value for native forms
const CONTROLS = [
	'input',
	'textarea',
	'button',
	'[role="switch"]',
	'[role="checkbox"]',
	'[role="radio"]',
	'[role="combobox"]',
]
	.map((selector) => `${selector}:not([aria-hidden="true"])`)
	.join(', ');

const isDisabled = (element: Element): boolean =>
	element.matches(':disabled') ||
	element.getAttribute('aria-disabled') === 'true' ||
	element.hasAttribute('data-disabled');

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

	it.each<[string, ChannelKind, ChannelFormValues]>([
		...Object.values(ChannelKind).map(
			(kind): [string, ChannelKind, ChannelFormValues] => [
				kind,
				kind,
				ChannelInitialConfig[kind],
			],
		),
		[
			'slack with field and action rows',
			ChannelKind.slack,
			{
				...ChannelInitialConfig[ChannelKind.slack],
				fields: [{ title: 'env', value: 'prod', short: true }],
				actions: [{ type: 'button', text: 'Open', url: 'https://example.com' }],
			},
		],
		[
			'webhook with basic auth',
			ChannelKind.webhook,
			{ webhookAuth: WebhookAuth.basic, username: 'alex', password: 'secret' },
		],
		[
			'webhook with a bearer token',
			ChannelKind.webhook,
			{ webhookAuth: WebhookAuth.bearer, bearerToken: 'token' },
		],
		[
			'self-hosted jira',
			ChannelKind.jira,
			{
				...ChannelInitialConfig[ChannelKind.jira],
				deployment: JiraDeployment.selfhosted,
			},
		],
	])('disables every control of a read-only %s form', (_, kind, values) => {
		const { result } = renderHook(() =>
			useForm<ChannelFormValues>({
				defaultValues: { name: 'Dummy-Channel', ...values },
				disabled: true,
			}),
		);

		render(
			<FormAlertChannels
				form={result.current}
				type={kind}
				onTypeChangeHandler={jest.fn()}
				onSaveHandler={jest.fn()}
				onTestHandler={jest.fn()}
				onDiscardHandler={jest.fn()}
				testingState={false}
				savingState={false}
				editing
				readOnly
			/>,
		);

		const controls = Array.from(
			screen.getByTestId('channel-form-fields').querySelectorAll(CONTROLS),
		);
		expect(controls.length).toBeGreaterThan(0);
		expect(
			controls
				.filter((control) => !isDisabled(control))
				.map((control) => control.outerHTML),
		).toStrictEqual([]);
	});
});
