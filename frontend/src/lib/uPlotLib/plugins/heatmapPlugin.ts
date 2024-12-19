import { Color } from '@signozhq/design-tokens';
import uPlot from 'uplot';

const bucketIncr = 5;

function heatmapPlugin(): uPlot.Plugin {
	function fillStyle(count: number): string {
		const colors = [Color.BG_CHERRY_500, Color.BG_SLATE_400];
		return colors[count - 1];
	}

	return {
		hooks: {
			draw: (u: uPlot): void => {
				const { ctx, data } = u;

				const yData = (data[3] as unknown) as number[][];
				const yQtys = (data[4] as unknown) as number[][];
				const yHgt = Math.floor(
					u.valToPos(bucketIncr, 'y', true) - u.valToPos(0, 'y', true),
				);

				ctx.save();
				ctx.beginPath();
				ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
				ctx.clip();

				yData.forEach((yVals, xi) => {
					const xPos = Math.floor(u.valToPos(data[0][xi], 'x', true));

					// const maxCount = yQtys[xi].reduce(
					// 	(acc, val) => Math.max(val, acc),
					// 	-Infinity,
					// );

					yVals.forEach((yVal, yi) => {
						const yPos = Math.floor(u.valToPos(yVal, 'y', true));

						ctx.fillStyle = fillStyle(yQtys[xi][yi]);
						ctx.fillRect(xPos - 4, yPos, 30, yHgt);
					});
				});

				ctx.restore();
			},
		},
	};
}
export default heatmapPlugin;
