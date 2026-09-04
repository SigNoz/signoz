import type { IAppContext } from 'providers/App/types';
import type { AppState } from 'store/reducers';
import type { QueryBuilderContextType } from 'types/common/queryBuilder';
import type { ROLES } from 'types/roles';

import type { AnyStoryMocks } from './controls/types';
import type { StoryMswParameter } from './msw/storyHandlers';

export type StoryTheme = 'dark' | 'light';

export type StoryRole = ROLES;

/** What a story or a mock module may set about the tree it renders in. */
export interface StoryOwnedConfig {
	/** Deep-merged over the default mocked `AppContext` value. */
	appContext?: Partial<IAppContext>;
	/** When set, replaces `QueryBuilderProvider` with a fixed context value. */
	queryBuilder?: Partial<QueryBuilderContextType>;
	/** Initial route, search included, e.g. `/home?relativeTime=1h`. */
	route?: string;
	/** Overrides the theme toolbar for this story. */
	theme?: StoryTheme;
	/**
	 * When set, the real redux store is seeded with this state instead of the
	 * reducers' own initial state.
	 */
	reduxState?: Partial<AppState>;
}

export interface SignozStoryConfig extends StoryOwnedConfig {
	/**
	 * The page's control-driven mocks, declared with `defineStoryMocks` and
	 * attached by spreading `storyMocks(...)` into the meta.
	 */
	mocks?: AnyStoryMocks;
}

/**
 * What the story runtime hands the provider tree. `role` is derived from the
 * Access controls rather than set by a story, so the mocked `AppContext` and the
 * mocked `authz/check` endpoint always answer from the same grant.
 */
export interface ResolvedStoryConfig extends StoryOwnedConfig {
	role: StoryRole;
}

export interface SignozStoryParameters {
	signoz?: SignozStoryConfig;
	msw?: StoryMswParameter;
}
