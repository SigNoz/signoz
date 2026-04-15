import { createBrowserHistory } from 'history';
import { getBasePath } from 'utils/getBasePath';

export default createBrowserHistory({ basename: getBasePath() });
