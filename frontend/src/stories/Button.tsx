import './button.css';

interface ButtonProps {
	/**
	 * Is this the principal call to action on the page?
	 */
	primary?: boolean;
	/**
	 * What background color to use
	 */
	backgroundColor?: string;
	/**
	 * How large should the button be?
	 */
	size: 'small' | 'medium' | 'large';
	/**
	 * Button contents
	 */
	label: string;
	/**
	 * Optional click handler
	 */
	onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export function Button({
	primary,
	size = 'medium',
	backgroundColor,
	label,
	...props
}: ButtonProps): JSX.Element {
	const mode = primary
		? 'storybook-button--primary'
		: 'storybook-button--secondary';
	return (
		<button
			type="button"
			className={['storybook-button', `storybook-button--${size}`, mode].join(' ')}
			style={{ backgroundColor }}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		>
			{label}
		</button>
	);
}

Button.defaultProps = {
	primary: false,
	backgroundColor: 'white',
	onClick: undefined,
};
