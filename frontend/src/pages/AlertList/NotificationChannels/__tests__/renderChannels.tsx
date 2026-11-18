import { VirtuosoMockContext } from 'react-virtuoso';
import { render } from 'tests/test-utils';

import NotificationChannels from '../NotificationChannels';

/** The list is virtualized, so jsdom needs a viewport for rows to mount. */
export function renderChannels(): ReturnType<typeof render> {
	return render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 46 }}>
			<NotificationChannels />
		</VirtuosoMockContext.Provider>,
	);
}
