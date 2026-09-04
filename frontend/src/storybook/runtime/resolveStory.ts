import type { RequestHandler, SetupWorker } from 'msw';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { USER_ROLES } from 'types/roles';

import type { AnyStoryMocks, StoryMockArgs } from '../controls/types';
import { globalMocks, type GlobalMockArgs } from '../globals';
import { storybookHandlers } from '../msw/handlers';
import { collectStoryHandlers } from '../msw/storyHandlers';
import type { MockResolver, MockResponse } from '../msw/types';
import { applyThemeBodyClass } from '../providers/applyThemeBodyClass';
import type {
	ResolvedStoryConfig,
	SignozStoryConfig,
	SignozStoryParameters,
	StoryOwnedConfig,
	StoryRole,
	StoryTheme,
} from '../types';
import { respondWith, type ResponseState } from './responseState';

/** Args of a page story: its own controls plus the ones every story carries. */
export type PageStoryArgs<TMocks extends AnyStoryMocks> = GlobalMockArgs &
	StoryMockArgs<TMocks>;

/**
 * What Storybook hands both the loader and the decorator. Declared structurally,
 * so the runtime does not depend on which lifecycle hook is calling it.
 */
export interface StoryRuntimeContext {
	id: string;
	parameters: SignozStoryParameters;
	args: Record<string, unknown>;
	globals?: Record<string, unknown>;
}

export interface StoryWorld {
	config: ResolvedStoryConfig;
	theme: StoryTheme;
	/**
	 * Changes with every control a mock reads. The provider tree is keyed on it so
	 * the story remounts with a fresh query cache instead of showing what the
	 * previous control values resolved to.
	 */
	key: string;
	/** In resolution order: msw answers with the first handler that matches. */
	handlers: RequestHandler[];
	install(worker: SetupWorker): void;
	/**
	 * Everything that has to be in place before the provider tree mounts:
	 * module-level app state, the theme `ThemeProvider` reads at boot, and the
	 * `<body>` markers that say what the controls resolved to.
	 */
	apply(): void;
}

const withoutMocks = (config: SignozStoryConfig): StoryOwnedConfig => {
	const owned = { ...config };
	delete (owned as SignozStoryConfig).mocks;
	return owned;
};

const mergeConfigs = (configs: StoryOwnedConfig[]): StoryOwnedConfig =>
	configs.reduce(
		(merged, config) => ({
			...merged,
			...config,
			appContext: { ...merged.appContext, ...config.appContext },
		}),
		{} as StoryOwnedConfig,
	);

const createMockResponse = (state: ResponseState): MockResponse => ({
	json: (build): MockResolver => respondWith(state, build),
});

const firstAnswer = <TAnswer>(
	answers: (TAnswer | undefined)[],
	fallback: TAnswer,
): TAnswer =>
	answers.find((answer): answer is TAnswer => answer !== undefined) ?? fallback;

const resolveWorld = (context: StoryRuntimeContext): StoryWorld => {
	const { parameters, args } = context;
	const storyConfig = parameters.signoz ?? {};

	// A page's own mocks resolve ahead of the global ones, so the page wins every
	// question both answer.
	const members: AnyStoryMocks[] = storyConfig.mocks
		? [storyConfig.mocks, ...globalMocks.members]
		: [...globalMocks.members];

	const values = members.map((mocks) => mocks.read(args));

	const response = createMockResponse(
		firstAnswer(
			members.map((mocks, index) => mocks.responseState?.(values[index])),
			'loaded',
		),
	);

	const role = firstAnswer(
		members.map((mocks, index) => mocks.role?.(values[index])),
		USER_ROLES.ADMIN as StoryRole,
	);

	const config = mergeConfigs([
		// Reversed, so a page's own config wins over the global one, and the
		// story's own `parameters.signoz` is the last word over both.
		...members
			.map((mocks, index) => mocks.config?.(values[index]) ?? {})
			.reverse(),
		withoutMocks(storyConfig),
	]);

	const theme = config.theme ?? (context.globals?.theme as StoryTheme) ?? 'dark';

	const valuesKey = JSON.stringify(values);

	const handlers = [
		// A story that declares its own handler always wins.
		...collectStoryHandlers(parameters.msw),
		...members.flatMap(
			(mocks, index) => mocks.handlers?.(values[index], response) ?? [],
		),
		// Shell endpoints, the jest handlers, then the catch-all that logs.
		...storybookHandlers,
	];

	return {
		config: { ...config, role },
		theme,
		key: `${theme}|${valuesKey}`,
		handlers,
		install: (worker): void => {
			worker.resetHandlers(...handlers);
		},
		apply: (): void => {
			members.forEach((mocks, index) => mocks.effect?.(values[index]));

			// `ThemeProvider` seeds its state from localStorage, so the value has to
			// be in place before it mounts; `key` forces the remount on a change.
			set(LOCALSTORAGE.THEME, theme);
			applyThemeBodyClass(theme);

			// Readable from the Elements panel, so what the controls resolved to can
			// be checked without reaching into the story store.
			document.body.dataset.signozStoryRole = role;
			document.body.dataset.signozStoryMocks = valuesKey;
		},
	};
};

let memo: { signature: string; world: StoryWorld } | undefined;

/**
 * The single owner of "story context → the world the story renders in". Both the
 * preview loader and the provider decorator ask for the same story render, so
 * the result is memoised on what the story is and what its controls hold.
 */
export const resolveStory = (context: StoryRuntimeContext): StoryWorld => {
	const signature = JSON.stringify([
		context.id,
		context.args,
		context.globals?.theme,
	]);

	if (memo?.signature !== signature) {
		memo = { signature, world: resolveWorld(context) };
	}

	return memo.world;
};
