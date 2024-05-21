import { CSSProperties } from 'react';

function PromQLIcon({
	fillColor,
}: {
	fillColor: CSSProperties['color'];
}): JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
		>
			<path
				d="M12 2c1 2.538 2.5 2.962 3.5 3.808.942.78 1.481 1.845 1.5 2.961 0 1.122-.527 2.198-1.464 2.992C14.598 12.554 13.326 13 12 13s-2.598-.446-3.536-1.24C7.527 10.968 7 9.892 7 8.77c0-.255 0-.508.1-.762.085.25.236.48.443.673.207.193.463.342.75.437a2.334 2.334 0 001.767-.128c.263-.135.485-.32.65-.539.166-.22.269-.468.301-.727a1.452 1.452 0 00-.11-.765 1.699 1.699 0 00-.501-.644C8 4.115 11 2 12 2zM17 16l-5 6-5-6h10z"
				stroke={fillColor}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default PromQLIcon;
