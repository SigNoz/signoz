import { createBrowserHistory, History } from 'history';

// Create the base history instance
const baseHistory = createBrowserHistory();

// Extend the History interface to include enhanced push method
interface EnhancedHistory extends History {
	push: {
		(path: string, state?: any): void;
		(
			path: string,
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

// Override push to handle meta/ctrl key events
history.push = function (
	path: string,
	eventOrState?: React.MouseEvent | MouseEvent | KeyboardEvent | any,
	state?: any,
): void {
	// Check if second argument is an event object
	const isEvent =
		eventOrState &&
		(eventOrState instanceof MouseEvent ||
			eventOrState instanceof KeyboardEvent ||
			eventOrState.nativeEvent instanceof MouseEvent ||
			eventOrState.nativeEvent instanceof KeyboardEvent ||
			eventOrState.metaKey !== undefined ||
			eventOrState.ctrlKey !== undefined);

	// If it's an event and meta/ctrl key is pressed, open in new tab
	if (isEvent && (eventOrState.metaKey || eventOrState.ctrlKey)) {
		window.open(path, '_blank');
		return;
	}

	// Otherwise, use normal navigation
	// If eventOrState is not an event, treat it as state
	const actualState = isEvent ? state : eventOrState;
	history.originalPush(path, actualState);
};

export default history;
