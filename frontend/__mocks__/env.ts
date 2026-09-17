// Handlers in src/mocks-server are pinned to absolute `http://localhost/...`
// URLs. Under jsdom the page origin already is that, but vitest browser mode
// serves the page from a random port, so relative request URLs would resolve
// somewhere msw is not listening. Make the base URL absolute instead, which
// resolves to the same request URL under both environments.
export const ENVIRONMENT = {
	baseURL: 'http://localhost',
	wsURL: '',
};
