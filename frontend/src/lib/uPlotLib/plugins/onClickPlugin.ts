export interface OnClickPluginOpts {
	onClick: (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
	) => void;
}

function onClickPlugin(opts: OnClickPluginOpts): uPlot.Plugin {
	let handleClick: (event: MouseEvent) => void;

	const hooks: uPlot.Plugin['hooks'] = {
		init: (u: uPlot) => {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			handleClick = function (event: MouseEvent) {
				const mouseX = event.offsetX + 40;
				const mouseY = event.offsetY + 40;

				// Convert pixel positions to data values
				const xValue = u.posToVal(mouseX, 'x');
				const yValue = u.posToVal(mouseY, 'y');

				opts.onClick(xValue, yValue, mouseX, mouseY);
			};

			u.over.addEventListener('click', handleClick);
		},
		destroy: (u: uPlot) => {
			u.over.removeEventListener('click', handleClick);
		},
	};

	return {
		hooks,
	};
}

export default onClickPlugin;
