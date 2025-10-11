import {
	createBrowserHistory,
	createPath,
	History,
	LocationDescriptorObject,
	LocationState,
} from 'history';
import { isEventObject } from 'hooks/useSafeNavigate';

// Create the base history instance
const baseHistory = createBrowserHistory();

type PathOrLocation = string | LocationDescriptorObject<LocationState>;

// Extend the History interface to include enhanced push method
interface EnhancedHistory extends History {
	push: {
		(path: PathOrLocation, state?: any): void;
		(
			path: PathOrLocation,
			event?: React.MouseEvent | MouseEvent | KeyboardEvent,
			state?: any,
		): void;
	};
	originalPush: History['push'];
}

// Create enhanced history with overridden push method
const history = baseHistory as EnhancedHistory;

// Store the original push method
history.originalPush = baseHistory.push;

// Override push to handle meta/ctrl key events and location objects
history.push = function (
	path: PathOrLocation,
	eventOrState?: React.MouseEvent | MouseEvent | KeyboardEvent | any,
	state?: any,
): void {
	// Check if second argument is an event object
	const isEvent = isEventObject(eventOrState);

	// If it's an event and meta/ctrl key is pressed, open in new tab
	if (isEvent && (eventOrState.metaKey || eventOrState.ctrlKey)) {
		// Convert location object to URL string using createPath from history
		const url = typeof path === 'string' ? path : createPath(path);
		window.open(url, '_blank');
		return;
	}

	// Otherwise, use normal navigation
	// The original push method already handles both strings and location objects
	// If eventOrState is not an event, treat it as state
	const actualState = isEvent ? state : eventOrState;
	history.originalPush(path, actualState);
};

export default history;
