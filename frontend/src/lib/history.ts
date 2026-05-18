import { createBrowserHistory } from 'history';
import { getBasePath } from 'utils/basePath';

export default createBrowserHistory({ basename: getBasePath() });
