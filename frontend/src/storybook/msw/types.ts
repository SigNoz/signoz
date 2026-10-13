import type {
	DefaultBodyType,
	PathParams,
	ResponseResolver,
	RestContext,
	RestRequest,
} from 'msw';

export type MockRequest = RestRequest<DefaultBodyType, PathParams>;

export type MockResolver = ResponseResolver<
	MockRequest,
	RestContext,
	DefaultBodyType
>;

/**
 * Resolver factory handed to a mock module's `handlers`. Endpoints declared
 * through it follow the response state, so one declaration covers the loaded,
 * loading and failed states. Endpoints that have to answer for the page to
 * render at all (ingestion detection, preferences) take a plain resolver
 * instead.
 */
export interface MockResponse {
	json: <TBody>(
		build: (req: MockRequest) => TBody | Promise<TBody>,
	) => MockResolver;
}
