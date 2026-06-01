import { createBrowserHistory } from 'history';
import { getBasePath } from 'utils/basePath';

const history = createBrowserHistory({ basename: getBasePath() });

let inAppPushCount = 0;
history.listen((_, action) => {
	if (action === 'PUSH') {
		inAppPushCount += 1;
	}
});

export const hasInAppHistory = (): boolean => inAppPushCount > 0;

export default history;
