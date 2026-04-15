import { createBrowserHistory } from 'history';

import { getBasePath } from './basePath';

// Strip the trailing slash that <base href> includes ('/signoz/' → '/signoz')
// because createBrowserHistory expects a basename without trailing slash.
const basename = getBasePath().replace(/\/$/, '') || undefined;

export default createBrowserHistory({ basename });
