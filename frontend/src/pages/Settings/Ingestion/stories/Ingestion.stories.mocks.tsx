/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { defaultFeatureFlags } from 'tests/fixtures/appContextMock';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	EXPIRIES,
	type Expiry,
	ingestionKeysResponse,
	KEYS_PER_PAGE,
	legacyIngestionResponse,
	LIMIT_SIGNALS,
	type LimitSignal,
} from './__story_mockdata__/ingestion';

const KEYS = 'Ingestion · keys';
const LIMITS = 'Ingestion · limits';

export const ingestionMocks = defineStoryMocks({
	controls: {
		gateway: toggleControl('Gateway', {
			group: KEYS,
			description:
				'The feature that puts key management in the console. Without it the tab is the read-only card of the single key the workspace was given.',
			value: true,
		}),
		keys: countControl('Ingestion keys', {
			group: KEYS,
			description: 'The page asks for ten at a time, which is the whole page.',
			value: 4,
			max: KEYS_PER_PAGE,
		}),
		expiry: choiceControl<Expiry>('Expiry', {
			group: KEYS,
			description:
				'When the keys run out. `soon` is inside the window the row warns about; `expired` is past it.',
			options: EXPIRIES,
			value: 'none',
		}),
		limits: multiChoiceControl<LimitSignal>('Signals with a limit', {
			group: LIMITS,
			description:
				'A signal without a limit shows the button that adds one instead of its usage against a cap.',
			options: LIMIT_SIGNALS,
			value: ['logs', 'traces'],
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/gateway/ingestion_keys/search',
			response.json((req) =>
				ingestionKeysResponse(
					values.keys,
					values.limits,
					values.expiry,
					Number(req.url.searchParams.get('page') ?? 1),
				),
			),
		),

		rest.get(
			'http://localhost/api/v2/gateway/ingestion_keys',
			response.json((req) =>
				ingestionKeysResponse(
					values.keys,
					values.limits,
					values.expiry,
					Number(req.url.searchParams.get('page') ?? 1),
				),
			),
		),

		rest.post(
			'http://localhost/api/v2/gateway/ingestion_keys',
			response.json(() => ({
				status: 'success',
				data: { id: 'ingestion-key-new', value: 'sk_new' },
			})),
		),

		rest.patch(
			'http://localhost/api/v2/gateway/ingestion_keys/:keyId',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.delete(
			'http://localhost/api/v2/gateway/ingestion_keys/:keyId',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.post(
			'http://localhost/api/v2/gateway/ingestion_keys/:keyId/limits',
			response.json(() => ({ status: 'success', data: { id: 'limit-new' } })),
		),

		rest.patch(
			'http://localhost/api/v2/gateway/ingestion_keys/limits/:limitId',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.delete(
			'http://localhost/api/v2/gateway/ingestion_keys/limits/:limitId',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v1/settings/ingestion_key',
			response.json(() => legacyIngestionResponse()),
		),
	],
	config: ({ gateway }) => ({
		route: ROUTES.INGESTION_SETTINGS,
		appContext: {
			featureFlags: defaultFeatureFlags.map((flag) =>
				flag.name === FeatureKeys.GATEWAY ? { ...flag, active: gateway } : flag,
			),
		},
	}),
});
