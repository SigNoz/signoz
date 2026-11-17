import { pickRole } from 'components/InviteMembers/__tests__/roleSelectUtils';
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import { rest, server } from 'mocks-server/server';
import type { NotificationInstance } from 'antd/es/notification/interface';
import { IAppContext } from 'providers/App/types';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import {
	AboutSigNozQuestions,
	SignozDetails,
} from '../AboutSigNozQuestions/AboutSigNozQuestions';
import OnboardingQuestionaire from '../index';
import InviteTeamMembers from '../InviteTeamMembers/InviteTeamMembers';
import OptimiseSignozNeeds from '../OptimiseSignozNeeds/OptimiseSignozNeeds';
import OrgQuestions, { OrgDetails } from '../OrgQuestions/OrgQuestions';

// Mock dependencies
jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

const mockNavigate = jest.mocked(navigate);

const mockNotificationError = jest.fn() as jest.MockedFunction<
	NotificationInstance['error']
>;

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

const EMPTY_ORG_DETAILS: OrgDetails = {
	usesObservability: true,
	observabilityTool: '',
	otherTool: '',
	usesOtel: null,
	migrationTimeline: null,
};

const EMPTY_SIGNOZ_DETAILS: SignozDetails = {
	interestInSignoz: [],
	otherInterestInSignoz: '',
	discoverSignoz: '',
};

const MIGRATION_QUESTION = /what is your timeline for migrating to signoz/i;

type User = ReturnType<typeof userEvent.setup>;

function renderOrgQuestions(orgDetails: Partial<OrgDetails> = {}): void {
	render(
		<OrgQuestions
			orgDetails={{ ...EMPTY_ORG_DETAILS, ...orgDetails }}
			onNext={jest.fn()}
		/>,
	);
}

function renderAboutSigNoz(signozDetails: Partial<SignozDetails> = {}): void {
	render(
		<AboutSigNozQuestions
			signozDetails={{ ...EMPTY_SIGNOZ_DETAILS, ...signozDetails }}
			setSignozDetails={jest.fn()}
			onNext={jest.fn()}
		/>,
	);
}

function renderOptimiseNeeds(): void {
	render(
		<OptimiseSignozNeeds
			isNextDisabled
			isUpdatingProfile={false}
			optimiseSignozDetails={{ logsPerDay: 0, hostsPerDay: 0, services: 0 }}
			setOptimiseSignozDetails={jest.fn()}
			onNext={jest.fn()}
			onWillDoLater={jest.fn()}
		/>,
	);
}

function sliderThumb(testId: string): HTMLInputElement {
	return screen
		.getByTestId(`${testId}-thumb-0`)
		.querySelector('input') as HTMLInputElement;
}

async function completeStep1(user: User): Promise<void> {
	await user.click(screen.getByTestId('observability-tool-item-DataDog'));
	await user.click(screen.getByTestId('uses-otel-item-yes'));
	await user.click(screen.getByTestId('migration-timeline-item-justExploring'));
	await user.click(screen.getByTestId('org-questions-next'));
}

async function completeStep2(user: User): Promise<void> {
	await user.type(
		await screen.findByTestId('discover-signoz-input-field'),
		'Found via Google',
	);
	await user.click(screen.getByTestId('interest-loweringCosts'));
	await user.click(screen.getByTestId('about-signoz-next'));
}

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
			renderOrgQuestions();

			expect(screen.getByTestId('org-questions-next')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('enables next button when all required fields are filled', async () => {
			const user = userEvent.setup();
			renderOrgQuestions();

			await user.click(screen.getByTestId('observability-tool-item-DataDog'));
			await user.click(screen.getByTestId('uses-otel-item-yes'));
			await user.click(
				screen.getByTestId('migration-timeline-item-justExploring'),
			);

			expect(screen.getByTestId('org-questions-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('shows other tool input when Others is selected', async () => {
			const user = userEvent.setup();
			renderOrgQuestions();

			await user.click(screen.getByTestId('observability-tool-item-Others'));

			await expect(
				screen.findByTestId('other-tool-input-field'),
			).resolves.toHaveAttribute('placeholder', 'What tool do you currently use?');
		});

		it('shows migration timeline options only when specific observability tools are selected', async () => {
			const user = userEvent.setup();
			renderOrgQuestions();

			// Initially not visible
			expect(screen.queryByText(MIGRATION_QUESTION)).not.toBeInTheDocument();

			await user.click(screen.getByTestId('observability-tool-item-DataDog'));

			expect(screen.getByText(MIGRATION_QUESTION)).toBeInTheDocument();

			// Not visible when None is selected
			await user.click(screen.getByTestId('observability-tool-item-None'));

			expect(screen.queryByText(MIGRATION_QUESTION)).not.toBeInTheDocument();
		});

		it('proceeds to step 2 when next is clicked', async () => {
			const user = userEvent.setup();
			render(<OnboardingQuestionaire />);

			await completeStep1(user);

			await expect(
				screen.findByText(/how did you first come across signoz/i),
			).resolves.toBeInTheDocument();
		});
	});

	describe('Step 2: About SigNoz', () => {
		it('renders about signoz questions', () => {
			renderAboutSigNoz();

			expect(screen.getByText(/set up your workspace/i)).toBeInTheDocument();
			expect(
				screen.getByText(/how did you first come across signoz/i),
			).toBeInTheDocument();
		});

		it('disables next button when fields are empty', () => {
			renderAboutSigNoz();

			expect(screen.getByTestId('about-signoz-next')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('enables next button when all fields are filled', async () => {
			const user = userEvent.setup();
			renderAboutSigNoz();

			const discoverInput = screen.getByTestId('discover-signoz-input-field');
			expect(discoverInput.getAttribute('placeholder')).toMatch(
				/^e\.g\., I asked ChatGPT/,
			);
			await user.type(discoverInput, 'Found via Google search');

			const interestCheckbox = screen.getByTestId('interest-loweringCosts');
			expect(interestCheckbox.closest('label')).toHaveTextContent(
				'Lowering observability costs',
			);
			await user.click(interestCheckbox);

			expect(screen.getByTestId('about-signoz-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('shows other interest input when Others checkbox is selected', async () => {
			const user = userEvent.setup();
			renderAboutSigNoz();

			expect(
				screen.getByText(/what got you interested in signoz/i),
			).toBeInTheDocument();

			await user.click(screen.getByTestId('interest-Others'));

			await expect(
				screen.findByTestId('other-interest-input-field'),
			).resolves.toHaveAttribute(
				'placeholder',
				'What got you interested in SigNoz?',
			);
		});
	});

	describe('Step 3: Optimize SigNoz Needs', () => {
		it('renders scale questions', () => {
			renderOptimiseNeeds();

			expect(
				screen.getByText(/what does your scale approximately look like/i),
			).toBeInTheDocument();
			expect(screen.getByText(/logs \/ day/i)).toBeInTheDocument();
			expect(screen.getByText(/number of services/i)).toBeInTheDocument();
		});

		it('fires PUT to /zeus/profiles and advances to step 4 on success', async () => {
			const user = userEvent.setup();
			let profilePutCalled = false;

			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) => {
					profilePutCalled = true;
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			await completeStep1(user);
			await completeStep2(user);

			// Click "I'll do this later" on step 3 — triggers PUT /zeus/profiles
			await user.click(await screen.findByTestId('optimise-needs-do-later'));

			// Step 3 content is gone — successfully advanced to step 4
			await expect(
				screen.findByTestId('do-later-button'),
			).resolves.toBeInTheDocument();
			expect(profilePutCalled).toBe(true);
			expect(
				screen.queryByText(/what does your scale approximately look like/i),
			).not.toBeInTheDocument();
		});

		it('shows do later button', () => {
			renderOptimiseNeeds();

			expect(screen.getByTestId('optimise-needs-do-later')).toHaveTextContent(
				"I'll do this later",
			);
		});
	});

	describe('Profile payload', () => {
		it('sends the typed tool, the typed interest and the slider values', async () => {
			const user = userEvent.setup();
			let profileBody: Record<string, unknown> | undefined;

			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, async (req, res, ctx) => {
					profileBody = await req.json();
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			await user.click(screen.getByTestId('observability-tool-item-Others'));
			await user.type(
				await screen.findByTestId('other-tool-input-field'),
				'Dynatrace',
			);
			await user.click(
				screen.getByTestId('migration-timeline-item-justExploring'),
			);
			await user.click(screen.getByTestId('uses-otel-item-yes'));
			await user.click(screen.getByTestId('org-questions-next'));

			await user.type(
				await screen.findByTestId('discover-signoz-input-field'),
				'Found via Google',
			);
			await user.click(screen.getByTestId('interest-loweringCosts'));
			await user.click(screen.getByTestId('interest-Others'));
			await user.type(
				await screen.findByTestId('other-interest-input-field'),
				'Better pricing',
			);
			await user.click(screen.getByTestId('about-signoz-next'));

			await screen.findByTestId('logs-per-day-slider');
			sliderThumb('logs-per-day-slider').focus();
			await user.keyboard('{End}');
			sliderThumb('hosts-per-day-slider').focus();
			await user.keyboard('{End}');
			await user.click(screen.getByTestId('optimise-needs-next'));

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
		});
	});

	describe('Step 4: Finish onboarding', () => {
		const ORG_ONBOARDING_ENDPOINT = '*/api/v1/org/preferences/org_onboarding';
		const LIST_PREFERENCES_ENDPOINT = '*/api/v1/org/preferences';
		const refreshedPreferences = [{ name: 'org_onboarding', value: true }];

		async function goToStep4(user: User): Promise<void> {
			await completeStep1(user);
			await completeStep2(user);
			await user.click(await screen.findByTestId('optimise-needs-do-later'));
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
			const user = userEvent.setup();
			const updateOrgPreferences = jest.fn() as jest.MockedFunction<
				IAppContext['updateOrgPreferences']
			>;
			const { bodies, listCalls } = mockFinish();

			render(<OnboardingQuestionaire />, undefined, {
				appContextOverrides: { updateOrgPreferences },
			});
			await goToStep4(user);

			await user.click(screen.getByTestId('do-later-button'));

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith(ROUTES.GET_STARTED_WITH_CLOUD);
			});
			expect(bodies).toStrictEqual([{ value: true }]);
			expect(listCalls()).toBe(1);
			expect(updateOrgPreferences).toHaveBeenCalledWith(refreshedPreferences);
		});

		it('moves on once the invites are sent', async () => {
			jest.useFakeTimers();
			try {
				const user = userEvent.setup({
					advanceTimers: (ms) => jest.advanceTimersByTime(ms),
				});
				const onNext = jest.fn() as jest.MockedFunction<() => void>;
				let inviteCalls = 0;
				server.use(
					rest.post(CREATE_USER_ENDPOINT, (_, res, ctx) => {
						inviteCalls += 1;
						return res(ctx.status(201), ctx.json({ data: { id: 'user-123' } }));
					}),
				);

				render(<InviteTeamMembers isLoading={false} onNext={onNext} />);

				await user.type(
					screen.getAllByPlaceholderText('e.g. john@signoz.io')[0],
					'alice@signoz.io',
				);
				await pickRole(user, 0, 'role-viewer');
				const sendInvites = screen.getByTestId('send-invites-button');
				await waitFor(() =>
					expect(sendInvites).not.toHaveAttribute('aria-disabled', 'true'),
				);
				await user.click(sendInvites);

				await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1), {
					timeout: 2000,
				});
				expect(inviteCalls).toBe(1);
			} finally {
				jest.useRealTimers();
			}
		});

		it('shows an error and stops loading when saving onboarding fails', async () => {
			const user = userEvent.setup();
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
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe('OrgQuestions: Others tool input', () => {
		const TOOL_VALUES = [
			'AWSCloudwatch',
			'DataDog',
			'NewRelic',
			'GrafanaPrometheus',
			'AzureAppMonitor',
			'GCPNativeO11yTools',
			'Honeycomb',
			'None',
			'Others',
		];

		function checkedTools(): string[] {
			return TOOL_VALUES.filter(
				(value) =>
					screen
						.getByTestId(`observability-tool-item-${value}`)
						.getAttribute('aria-checked') === 'true',
			);
		}

		it('keeps Others selected while typing Space and arrow keys in its input', async () => {
			const user = userEvent.setup();
			renderOrgQuestions();

			await user.click(screen.getByTestId('observability-tool-item-Others'));
			const otherToolInput = await screen.findByTestId('other-tool-input-field');
			expect(checkedTools()).toStrictEqual(['Others']);

			await user.type(
				otherToolInput,
				'Dyna trace{ArrowLeft}{ArrowRight}{ArrowRight}{ArrowDown}{ArrowUp}{ArrowLeft}',
			);

			expect(otherToolInput).toHaveValue('Dyna trace');
			expect(screen.getByTestId('other-tool-input-field')).toBe(otherToolInput);
			expect(checkedTools()).toStrictEqual(['Others']);
		});

		it('clears the typed tool when switching to another tool', async () => {
			const user = userEvent.setup();
			renderOrgQuestions({ observabilityTool: 'Others' });

			await user.type(screen.getByTestId('other-tool-input-field'), 'Dynatrace');
			await user.click(screen.getByTestId('observability-tool-item-DataDog'));
			expect(
				screen.queryByTestId('other-tool-input-field'),
			).not.toBeInTheDocument();

			await user.click(screen.getByTestId('observability-tool-item-Others'));

			await expect(
				screen.findByTestId('other-tool-input-field'),
			).resolves.toHaveValue('');
		});

		it('resets the migration timeline when None is chosen', async () => {
			const user = userEvent.setup();
			renderOrgQuestions({
				observabilityTool: 'DataDog',
				migrationTimeline: 'justExploring',
			});

			await user.click(screen.getByTestId('observability-tool-item-None'));

			expect(screen.queryByText(MIGRATION_QUESTION)).not.toBeInTheDocument();

			await user.click(screen.getByTestId('observability-tool-item-DataDog'));

			expect(
				screen.getByTestId('migration-timeline-item-justExploring'),
			).toHaveAttribute('aria-checked', 'false');
		});
	});

	describe('Next button disabled reasons', () => {
		it.each<[string, Partial<OrgDetails>, string]>([
			['no tool is chosen', {}, 'Select the observability tool you use'],
			[
				'the migration timeline is missing',
				{ observabilityTool: 'DataDog' },
				'Select your migration timeline',
			],
			[
				'the OpenTelemetry answer is missing',
				{ observabilityTool: 'DataDog', migrationTimeline: 'justExploring' },
				'Tell us if you already use OpenTelemetry',
			],
			[
				'the typed tool is missing',
				{
					observabilityTool: 'Others',
					migrationTimeline: 'justExploring',
					usesOtel: false,
				},
				'Enter the observability tool you use',
			],
		])(
			'step 1 explains why Next is disabled when %s',
			async (_, details, reason) => {
				const user = userEvent.setup();
				renderOrgQuestions(details);

				const nextButton = screen.getByTestId('org-questions-next');
				expect(nextButton).toHaveAttribute('aria-disabled', 'true');
				await user.hover(nextButton);
				await expect(screen.findByText(reason)).resolves.toBeInTheDocument();
			},
		);

		it('step 1 enables Next once OpenTelemetry is answered', async () => {
			const user = userEvent.setup();
			renderOrgQuestions({
				observabilityTool: 'DataDog',
				migrationTimeline: 'justExploring',
			});

			await user.click(screen.getByTestId('uses-otel-item-no'));

			expect(screen.getByTestId('org-questions-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('step 1 enables Next once the other tool is typed', async () => {
			const user = userEvent.setup();
			renderOrgQuestions({
				observabilityTool: 'Others',
				migrationTimeline: 'justExploring',
				usesOtel: false,
			});

			await user.type(screen.getByTestId('other-tool-input-field'), 'Dynatrace');

			expect(screen.getByTestId('org-questions-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it.each<[string, Partial<SignozDetails>, string]>([
			['nothing is answered', {}, 'Tell us how you first came across SigNoz'],
			[
				'no interest is chosen',
				{ discoverSignoz: 'Found via Google' },
				'Select what got you interested in SigNoz',
			],
			[
				'the other interest is not described',
				{ discoverSignoz: 'Found via Google', interestInSignoz: ['Others'] },
				'Describe what got you interested in SigNoz',
			],
		])(
			'step 2 explains why Next is disabled when %s',
			async (_, details, reason) => {
				const user = userEvent.setup();
				renderAboutSigNoz(details);

				const nextButton = screen.getByTestId('about-signoz-next');
				expect(nextButton).toHaveAttribute('aria-disabled', 'true');
				await user.hover(nextButton);
				await expect(screen.findByText(reason)).resolves.toBeInTheDocument();
			},
		);

		it('step 2 enables Next once the other interest is described', async () => {
			const user = userEvent.setup();
			renderAboutSigNoz({
				discoverSignoz: 'Found via Google',
				interestInSignoz: ['Others'],
			});

			await user.type(
				screen.getByTestId('other-interest-input-field'),
				'Better pricing',
			);

			expect(screen.getByTestId('about-signoz-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('step 3 explains why Next is disabled', async () => {
			const user = userEvent.setup();
			renderOptimiseNeeds();

			const nextButton = screen.getByTestId('optimise-needs-next');
			expect(nextButton).toHaveAttribute('aria-disabled', 'true');
			await user.hover(nextButton);
			await expect(
				screen.findByText('Set at least one of the values above'),
			).resolves.toBeInTheDocument();
		});

		it('step 3 keeps Next disabled while every slider is 0', async () => {
			const user = userEvent.setup();
			let profileCalls = 0;
			server.use(
				rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) => {
					profileCalls += 1;
					return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
				}),
			);

			render(<OnboardingQuestionaire />);

			await user.click(screen.getByTestId('observability-tool-item-None'));
			await user.click(screen.getByTestId('uses-otel-item-no'));
			await user.click(screen.getByTestId('org-questions-next'));
			await completeStep2(user);

			const nextButton = await screen.findByTestId('optimise-needs-next');
			expect(nextButton).toHaveAttribute('aria-disabled', 'true');

			await user.click(nextButton);
			expect(profileCalls).toBe(0);

			sliderThumb('services-slider').focus();
			await user.keyboard('{ArrowRight}');

			expect(screen.getByTestId('optimise-needs-next')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});
});
