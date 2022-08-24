import React from 'react';

interface OptionIconProps {
	isDarkMode: boolean;
}
function OptionIcon({ isDarkMode }: OptionIconProps): JSX.Element {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			x="0px"
			y="0px"
			width="1rem"
			height="1rem"
			viewBox="0 0 52 52"
			enableBackground="new 0 0 52 52"
			fill={isDarkMode ? '#eee' : '#222'}
		>
			<path
				d="M20,44c0-3.3,2.7-6,6-6s6,2.7,6,6s-2.7,6-6,6S20,47.3,20,44z M20,26c0-3.3,2.7-6,6-6s6,2.7,6,6s-2.7,6-6,6
	S20,29.3,20,26z M20,8c0-3.3,2.7-6,6-6s6,2.7,6,6s-2.7,6-6,6S20,11.3,20,8z"
			/>
		</svg>
	);
}

export default OptionIcon;
