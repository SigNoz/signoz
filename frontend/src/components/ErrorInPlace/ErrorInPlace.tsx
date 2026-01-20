import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { ReactNode } from 'react';
import APIError from 'types/api/error';

interface ErrorInPlaceProps {
	/** The error object to display */
	error: APIError;
	/** Custom class name */
	className?: string;
	/** Custom style */
	style?: React.CSSProperties;
	/** Whether to show a border */
	bordered?: boolean;
	/** Background color */
	background?: string;
	/** Padding */
	padding?: string | number;
	/** Height - defaults to 100% to take available space */
	height?: string | number;
	/** Width - defaults to 100% to take available space */
	width?: string | number;
	/** Custom content instead of ErrorContent */
	children?: ReactNode;
}

/**
 * ErrorInPlace - A component that renders error content directly in the available space
 * of its parent container. Perfect for displaying errors in widgets, cards, or any
 * container where you want the error to take up the full available space.
 *
 * @example
 * <ErrorInPlace error={error} />
 *
 * @example
 * <ErrorInPlace error={error} bordered background="#f5f5f5" padding={16} />
 */
function ErrorInPlace({
	error,
	className = '',
	style,
	bordered = false,
	background,
	padding = 16,
	height = '100%',
	width = '100%',
	children,
}: ErrorInPlaceProps): JSX.Element {
	const containerStyle: React.CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		width,
		height,
		padding: typeof padding === 'number' ? `${padding}px` : padding,
		backgroundColor: background,
		border: bordered ? '1px solid var(--bg-slate-400, #374151)' : 'none',
		borderRadius: bordered ? '4px' : '0',
		overflow: 'auto',
		...style,
	};

	return (
		<div className={`error-in-place ${className}`.trim()} style={containerStyle}>
			{children || <ErrorContent error={error} />}
		</div>
	);
}

ErrorInPlace.defaultProps = {
	className: undefined,
	style: undefined,
	bordered: undefined,
	background: undefined,
	padding: undefined,
	height: undefined,
	width: undefined,
	children: undefined,
};

export default ErrorInPlace;
