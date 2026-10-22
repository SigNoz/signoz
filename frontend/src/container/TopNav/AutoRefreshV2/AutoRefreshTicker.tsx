import { useAutoRefreshSelection } from './useAutoRefreshSelection';
import { useAutoRefreshTick } from './useAutoRefreshTick';

/** Auto-refresh timer for views that hide the time selector that normally owns it. */
function AutoRefreshTicker(): null {
	const { isEnabled, intervalMs } = useAutoRefreshSelection();

	useAutoRefreshTick(isEnabled, intervalMs);

	return null;
}

export default AutoRefreshTicker;
