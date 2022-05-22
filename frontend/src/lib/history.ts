import { ENVIRONMENT } from 'constants/env';
import { createBrowserHistory } from 'history';

export default createBrowserHistory({
	basename: ENVIRONMENT.baseConstant,
});
