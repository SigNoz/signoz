import ROUTES from 'constants/routes';
import history from 'lib/history';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import OnboardingQuestionaire from '../index';

// Mock dependencies
jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			pathname: '/onboarding',
			search: '',
			hash: '',
			state: null,
		},
	},
}));

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

const mockNotificationError = jest.fn();

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): unknown => ({
		notifications: {
			success: jest.fn(),
			error: mockNotificationError,
			warning: jest.fn(),
			info: jest.fn(),
		},
	}),
}));

// API Endpoints
const ORG_PREFERENCES_ENDPOINT = '*/api/v1/org/preferences/list';
const UPDATE_ORG_PREFERENCE_ENDPOINT = '*/api/v1/org/preferences/name/update';
const UPDATE_PROFILE_ENDPOINT = '*/api/v2/zeus/profiles';
const EDIT_ORG_ENDPOINT = '*/api/v2/orgs/me';
const CREATE_USER_ENDPOINT = '*/api/v2/users';
const LIST_ROLES_ENDPOINT = '*/api/v1/roles';

const mockOrgPreferences = {
	data: {
		org_onboarding: false,
	},
	status: 'success',
};

const MOCK_ROLES = [
	{ id: 'role-admin', name: 'Admin', description: 'Admin role' },
	{ id: 'role-editor', name: 'Editor', description: 'Editor role' },
	{ id: 'role-viewer', name: 'Viewer', description: 'Viewer role' },
];

describe('OnboardingQuestionaire Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		server.use(
			rest.get(ORG_PREFERENCES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockOrgPreferences)),
			),
			rest.put(EDIT_ORG_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(204), ctx.json({ status: 'success' })),
			),
			rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
			rest.post(UPDATE_ORG_PREFERENCE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success' })),
			),
			rest.get(LIST_ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: MOCK_ROLES })),
			),
			rest.post(CREATE_USER_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(201), ctx.json({ data: { id: 'user-123' } })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Step 1: Organization Details', () => {
		it('renders organization questions on initial load', () => {
			render(<OnboardingQuestionaire />);

			expect(screen.getByText(/welcome to signoz cloud/i)).toBeInTheDocument();

			expect(
				screen.getByText(/which observability tool do you currently use/i),
			).toBeInTheDocument();
		});

		it('disables next button when required fields are empty', () => {
			render(<OnboardingQuestionaire />);

			const nextButton = screen.getByRole('button', { name: /next/i });
			expect(nextButton).toHaveAttribute('aria-disabled', 'true');
		});

		it('enables next button when all required fields are filled', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			const datadogCheckbox = screen.getByRole('radio', { name: /datadog/i });
			await user.click(datadogCheckbox);

			const otelYes = screen.getByRole('radio', { name: /yes/i });
			await user.click(otelYes);
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));

			const nextButton = await screen.findByRole('button', { name: /next/i });
			expect(nextButton).not.toHaveAttribute('aria-disabled', 'true');
		});

		it('shows other tool input when Others is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			const othersCheckbox = screen.getByRole('radio', { name: /^others$/i });
			await user.click(othersCheckbox);

			await expect(
				screen.findByPlaceholderText(/what tool do you currently use/i),
			).resolves.toBeInTheDocument();
		});

		it('shows migration timeline options only when specific observability tools are selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Initially not visible
			expect(
				screen.queryByText(/What is your timeline for migrating to SigNoz/i),
			).not.toBeInTheDocument();

			const datadogCheckbox = screen.getByRole('radio', { name: /datadog/i });
			await user.click(datadogCheckbox);

			await expect(
				screen.findByText(/What is your timeline for migrating to SigNoz/i),
			).resolves.toBeInTheDocument();

			// Not visible when None is selected
			const noneCheckbox = screen.getByRole('radio', {
				name: /none\/starting fresh/i,
			});
			await user.click(noneCheckbox);

			expect(
				screen.queryByText(/What is your timeline for migrating to SigNoz/i),
			).not.toBeInTheDocument();
		});

		it('proceeds to step 2 when next is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));

			const nextButton = screen.getByRole('button', { name: /next/i });
			await user.click(nextButton);

			await expect(
				screen.findByText(/how did you first come across signoz/i, {}),
			).resolves.toBeInTheDocument();
		});
	});

	describe('Step 2: About SigNoz', () => {
		it('renders about signoz questions after step 1 completion', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByText(/set up your workspace/i, {}),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/how did you first come across signoz/i, {}),
			).resolves.toBeInTheDocument();
		});

		it('disables next button when fields are empty', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await waitFor(() => {
				const nextButton = screen.getByRole('button', { name: /next/i });
				expect(nextButton).toHaveAttribute('aria-disabled', 'true');
			});
		});

		it('enables next button when all fields are filled', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i, {}),
			).resolves.toBeInTheDocument();

			const discoverInput = screen.getByPlaceholderText(
				/e\.g\., I asked ChatGPT/i,
			);
			await user.type(discoverInput, 'Found via Google search');

			const interestCheckbox = screen.getByRole('checkbox', {
				name: /lowering observability costs/i,
			});
			await user.click(interestCheckbox);

			const nextButton = await screen.findByRole('button', { name: /next/i });
			expect(nextButton).not.toHaveAttribute('aria-disabled', 'true');
		});

		it('shows other interest input when Others checkbox is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByText(/what got you interested in signoz/i, {}),
			).resolves.toBeInTheDocument();

			const othersCheckbox = screen.getByRole('checkbox', { name: /^others$/i });
			await user.click(othersCheckbox);

			await expect(
				screen.findByPlaceholderText(/what got you interested in signoz/i, {}),
			).resolves.toBeInTheDocument();
		});
	});

	describe('Step 3: Optimize SigNoz Needs', () => {
		it('renders scale questions after step 2 completion', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate through steps 1 and 2

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i, {}),
			).resolves.toBeInTheDocument();

			await user.type(
				screen.getByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByText(/what does your scale approximately look like/i, {}),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/logs \/ day/i, {}),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/number of services/i, {}),
			).resolves.toBeInTheDocument();
		});

		it('fires PUT to /zeus/profiles and advances to step 4 on success', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let profilePutCalled = false;

			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) => {
					profilePutCalled = true;
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			// Navigate to step 3
			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await user.type(
				await screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			// Click "I'll do this later" on step 3 — triggers PUT /zeus/profiles
			await user.click(
				await screen.findByRole('button', { name: /i'll do this later/i }),
			);

			await waitFor(() => {
				expect(profilePutCalled).toBe(true);
				// Step 3 content is gone — successfully advanced to step 4
				expect(
					screen.queryByText(/what does your scale approximately look like/i),
				).not.toBeInTheDocument();
			});
		});

		it('shows do later button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 3

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i, {}),
			).resolves.toBeInTheDocument();

			await user.type(
				screen.getByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			await expect(
				screen.findByRole('button', { name: /i'll do this later/i }),
			).resolves.toBeInTheDocument();
		});
	});

	describe('Profile payload', () => {
		it('sends the typed tool, the typed interest and the slider values', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let profileBody: Record<string, unknown> | undefined;

			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, async (req, res, ctx) => {
					profileBody = await req.json();
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			await user.click(screen.getByText('Others'));
			await user.type(
				await screen.findByPlaceholderText(/what tool do you currently use/i),
				'Dynatrace',
			);
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await user.type(
				await screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('checkbox', { name: /^others$/i }));
			await user.type(
				await screen.findByPlaceholderText(/what got you interested in signoz/i),
				'Better pricing',
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			const [logsSlider, hostsSlider] = await screen.findAllByRole('slider');
			logsSlider.focus();
			await user.keyboard('{End}');
			hostsSlider.focus();
			await user.keyboard('{End}');
			await user.click(screen.getByRole('button', { name: /next/i }));

			await waitFor(() => expect(profileBody).toBeDefined());
			expect(profileBody).toStrictEqual({
				uses_otel: true,
				has_existing_observability_tool: true,
				existing_observability_tool: 'Dynatrace',
				where_did_you_discover_signoz: 'Found via Google',
				timeline_for_migrating_to_signoz: 'justExploring',
				reasons_for_interest_in_signoz: ['loweringCosts', 'Better pricing'],
				logs_scale_per_day_in_gb: 10000,
				number_of_hosts: 10000,
				number_of_services: 0,
			});
		}, 15000);
	});

	describe('Step 4: Finish onboarding', () => {
		const ORG_ONBOARDING_ENDPOINT = '*/api/v1/org/preferences/org_onboarding';
		const LIST_PREFERENCES_ENDPOINT = '*/api/v1/org/preferences';
		const refreshedPreferences = [{ name: 'org_onboarding', value: true }];

		async function goToStep4(
			user: ReturnType<typeof userEvent.setup>,
		): Promise<void> {
			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await user.type(
				await screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			await user.click(
				await screen.findByRole('button', { name: /i'll do this later/i }),
			);
			await screen.findByTestId('do-later-button');
		}

		function mockFinish(status = 204): {
			bodies: unknown[];
			listCalls: () => number;
		} {
			const bodies: unknown[] = [];
			let listCalls = 0;
			server.use(
				rest.put(ORG_ONBOARDING_ENDPOINT, async (req, res, ctx) => {
					bodies.push(await req.json());
					if (status >= 400) {
						return res(
							ctx.status(status),
							ctx.json({
								error: { code: 'internal', message: 'could not save onboarding' },
							}),
						);
					}
					return res(ctx.status(status));
				}),
				rest.get(LIST_PREFERENCES_ENDPOINT, (_, res, ctx) => {
					listCalls += 1;
					return res(
						ctx.status(200),
						ctx.json({ status: 'success', data: refreshedPreferences }),
					);
				}),
			);
			return { bodies, listCalls: (): number => listCalls };
		}

		it('marks onboarding done, refetches preferences and redirects on "do later"', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const updateOrgPreferences = jest.fn();
			const { bodies, listCalls } = mockFinish();

			render(<OnboardingQuestionaire />, undefined, {
				appContextOverrides: { updateOrgPreferences },
			});
			await goToStep4(user);

			await user.click(screen.getByTestId('do-later-button'));

			await waitFor(() => {
				expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.GET_STARTED_WITH_CLOUD);
			});
			expect(bodies).toStrictEqual([{ value: true }]);
			expect(listCalls()).toBe(1);
			expect(updateOrgPreferences).toHaveBeenCalledWith(refreshedPreferences);
		}, 15000);

		it('marks onboarding done and redirects after the invites are sent', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let inviteCalls = 0;
			const { bodies, listCalls } = mockFinish();
			server.use(
				rest.post(CREATE_USER_ENDPOINT, (_, res, ctx) => {
					inviteCalls += 1;
					return res(ctx.status(201), ctx.json({ data: { id: 'user-123' } }));
				}),
			);

			render(<OnboardingQuestionaire />);
			await goToStep4(user);

			await user.type(
				screen.getAllByPlaceholderText('e.g. john@signoz.io')[0],
				'alice@signoz.io',
			);
			await user.click(screen.getAllByText('Select roles')[0]);
			await user.click(await screen.findByTitle('Viewer'));
			await user.click(screen.getByTestId('send-invites-button'));

			await waitFor(
				() => {
					expect(mockHistoryPush).toHaveBeenCalledWith(
						ROUTES.GET_STARTED_WITH_CLOUD,
					);
				},
				{ timeout: 3000 },
			);
			expect(inviteCalls).toBe(1);
			expect(bodies).toStrictEqual([{ value: true }]);
			expect(listCalls()).toBe(1);
		}, 15000);

		it('shows an error and stops loading when saving onboarding fails', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { listCalls } = mockFinish(500);

			render(<OnboardingQuestionaire />);
			await goToStep4(user);

			const doLaterButton = screen.getByTestId('do-later-button');
			await user.click(doLaterButton);

			await waitFor(() => {
				expect(mockNotificationError).toHaveBeenCalledWith({
					message: 'could not save onboarding',
				});
			});
			await waitFor(() => {
				expect(doLaterButton).not.toHaveAttribute('aria-busy');
			});
			expect(listCalls()).toBe(0);
			expect(mockHistoryPush).not.toHaveBeenCalled();
		}, 15000);
	});

	describe('OrgQuestions: Others tool input', () => {
		function toolRadioGroup(): HTMLElement {
			return screen.getAllByRole('radiogroup')[0];
		}

		function checkedTools(): HTMLElement[] {
			return within(toolRadioGroup())
				.getAllByRole('radio')
				.filter((radio) => radio.getAttribute('aria-checked') === 'true');
		}

		it('keeps Others selected while typing Space and arrow keys in its input', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(screen.getByText('Others'));
			const otherToolInput = await screen.findByPlaceholderText(
				/what tool do you currently use/i,
			);
			const othersRadio = checkedTools()[0];

			await user.type(
				otherToolInput,
				'Dyna trace{ArrowLeft}{ArrowRight}{ArrowRight}{ArrowDown}{ArrowUp}{ArrowLeft}',
			);

			expect(otherToolInput).toHaveValue('Dyna trace');
			expect(screen.getByPlaceholderText(/what tool do you currently use/i)).toBe(
				otherToolInput,
			);
			expect(checkedTools()).toStrictEqual([othersRadio]);
		});

		it('clears the typed tool when switching to another tool', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(screen.getByText('Others'));
			await user.type(
				await screen.findByPlaceholderText(/what tool do you currently use/i),
				'Dynatrace',
			);
			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			expect(
				screen.queryByPlaceholderText(/what tool do you currently use/i),
			).not.toBeInTheDocument();

			await user.click(screen.getByText('Others'));

			await expect(
				screen.findByPlaceholderText(/what tool do you currently use/i),
			).resolves.toHaveValue('');
		});

		it('resets the migration timeline when None is chosen', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await user.click(
				screen.getByRole('radio', { name: /none\/starting fresh/i }),
			);

			expect(
				screen.queryByText(/what is your timeline for migrating to signoz/i),
			).not.toBeInTheDocument();

			await user.click(screen.getByRole('radio', { name: /datadog/i }));

			await expect(
				screen.findByRole('radio', { name: /just exploring/i }),
			).resolves.toHaveAttribute('aria-checked', 'false');
		});
	});

	describe('Next button disabled reasons', () => {
		async function expectNextDisabledWith(
			user: ReturnType<typeof userEvent.setup>,
			reason: string,
		): Promise<void> {
			const nextButton = screen.getByRole('button', { name: /next/i });
			expect(nextButton).toHaveAttribute('aria-disabled', 'true');
			await user.hover(nextButton);
			await waitFor(() => {
				expect(
					screen
						.getAllByRole('tooltip')
						.some((tooltip) => tooltip.textContent?.includes(reason)),
				).toBe(true);
			});
			await user.unhover(nextButton);
		}

		it('step 1 explains each missing answer until all are given', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await expectNextDisabledWith(user, 'Select the observability tool you use');

			await user.click(screen.getByRole('radio', { name: /datadog/i }));
			await expectNextDisabledWith(user, 'Select your migration timeline');

			await user.click(screen.getByRole('radio', { name: /just exploring/i }));
			await expectNextDisabledWith(
				user,
				'Tell us if you already use OpenTelemetry',
			);

			await user.click(screen.getByRole('radio', { name: /^no$/i }));
			expect(screen.getByRole('button', { name: /next/i })).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);

			await user.click(screen.getByText('Others'));
			await expectNextDisabledWith(user, 'Enter the observability tool you use');

			await user.type(
				screen.getByPlaceholderText(/what tool do you currently use/i),
				'Dynatrace',
			);
			expect(screen.getByRole('button', { name: /next/i })).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		}, 15000);

		it('step 2 explains each missing answer until all are given', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(
				screen.getByRole('radio', { name: /none\/starting fresh/i }),
			);
			await user.click(screen.getByRole('radio', { name: /^no$/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));

			const discoverInput = await screen.findByPlaceholderText(
				/e\.g\., I asked ChatGPT/i,
			);
			await expectNextDisabledWith(
				user,
				'Tell us how you first came across SigNoz',
			);

			await user.type(discoverInput, 'Found via Google');
			await expectNextDisabledWith(
				user,
				'Select what got you interested in SigNoz',
			);

			await user.click(screen.getByRole('checkbox', { name: /^others$/i }));
			await expectNextDisabledWith(
				user,
				'Describe what got you interested in SigNoz',
			);

			await user.type(
				await screen.findByPlaceholderText(/what got you interested in signoz/i),
				'Better pricing',
			);
			expect(screen.getByRole('button', { name: /next/i })).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		}, 15000);

		it('step 3 keeps Next disabled while every slider is 0', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let profileCalls = 0;
			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) => {
					profileCalls += 1;
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			await user.click(
				screen.getByRole('radio', { name: /none\/starting fresh/i }),
			);
			await user.click(screen.getByRole('radio', { name: /^no$/i }));
			await user.click(screen.getByRole('button', { name: /next/i }));
			await user.type(
				await screen.findByPlaceholderText(/e\.g\., I asked ChatGPT/i),
				'Found via Google',
			);
			await user.click(
				screen.getByRole('checkbox', { name: /lowering observability costs/i }),
			);
			await user.click(screen.getByRole('button', { name: /next/i }));

			const [, , servicesSlider] = await screen.findAllByRole('slider');
			await expectNextDisabledWith(user, 'Set at least one of the values above');

			await user.click(screen.getByRole('button', { name: /next/i }));
			expect(profileCalls).toBe(0);

			servicesSlider.focus();
			await user.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /next/i })).not.toHaveAttribute(
					'aria-disabled',
					'true',
				);
			});
		}, 15000);
	});
});
