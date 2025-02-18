import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { themeColors } from 'constants/theme';
import dayjs from 'dayjs';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';

const tooltipPlugin = (
	isDarkMode: boolean,
	timezone: string,
): { hooks: { init: (u: any) => void } } => {
	let tooltip: HTMLDivElement;
	const tooltipLeftOffset = 10;
	const tooltipTopOffset = 10;
	let isMouseOverPlot = false;

	function formatValue(value: string | number | Date): string | number | Date {
		if (typeof value === 'string' && !Number.isNaN(parseFloat(value))) {
			return parseFloat(value).toFixed(3);
		}
		if (typeof value === 'number') {
			return value.toFixed(3);
		}
		if (value instanceof Date) {
			return dayjs(value)
				.tz(timezone)
				.format(DATE_TIME_FORMATS.US_DATETIME_SECONDS);
		}
		if (value == null) {
			return 'N/A';
		}

		return String(value);
	}

	function updateTooltip(u: any, left: number, top: number): void {
		const idx = u.posToIdx(left);
		const xVal = u.data[0][idx];

		if (xVal == null) {
			tooltip.style.display = 'none';
			return;
		}

		const xDate = new Date(xVal * 1000);
		const formattedXDate = formatValue(xDate);

		let tooltipContent = `<div class="uplot-tooltip-title">Time: ${formattedXDate}</div>`;

		let mainValue;
		let upperBand;
		let lowerBand;

		let color = null;

		// Loop through all series (excluding the x-axis series)
		for (let i = 1; i < u.series.length; i++) {
			const series = u.series[i];

			const yVal = u.data[i][idx];
			const formattedYVal = formatValue(yVal);

			color = generateColor(
				series.label,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			);

			// Create the round marker for the series
			const marker = `<span class="uplot-tooltip-marker" style="background-color: ${color};"></span>`;

			if (series.label.toLowerCase().includes('upper band')) {
				upperBand = formattedYVal;
			} else if (series.label.toLowerCase().includes('lower band')) {
				lowerBand = formattedYVal;
			} else if (series.label.toLowerCase().includes('main series')) {
				mainValue = formattedYVal;
			} else {
				tooltipContent += `
              <div class="uplot-tooltip-series">
                ${marker}
                <span class="uplot-tooltip-series-name">${series.label}:</span>
                <span class="uplot-tooltip-series-value">${formattedYVal}</span>
              </div>`;
			}
		}

		// Add main value, upper band, and lower band to the tooltip
		if (mainValue !== undefined) {
			const marker = `<span class="uplot-tooltip-marker"></span>`;
			tooltipContent += `
          <div class="uplot-tooltip-series">
            ${marker}
            <span class="uplot-tooltip-series-name">Main Series:</span>
            <span class="uplot-tooltip-series-value">${mainValue}</span>
          </div>`;
		}
		if (upperBand !== undefined) {
			const marker = `<span class="uplot-tooltip-marker"></span>`;
			tooltipContent += `
          <div class="uplot-tooltip-series">
            ${marker}
            <span class="uplot-tooltip-series-name">Upper Band:</span>
            <span class="uplot-tooltip-series-value">${upperBand}</span>
          </div>`;
		}
		if (lowerBand !== undefined) {
			const marker = `<span class="uplot-tooltip-marker"></span>`;
			tooltipContent += `
          <div class="uplot-tooltip-series">
            ${marker}
            <span class="uplot-tooltip-series-name">Lower Band:</span>
            <span class="uplot-tooltip-series-value">${lowerBand}</span>
          </div>`;
		}

		tooltip.innerHTML = tooltipContent;
		tooltip.style.display = 'block';
		tooltip.style.left = `${left + tooltipLeftOffset}px`;
		tooltip.style.top = `${top + tooltipTopOffset}px`;
	}

	function init(u: any): void {
		tooltip = document.createElement('div');
		tooltip.className = 'uplot-tooltip';
		tooltip.style.display = 'none';
		u.over.appendChild(tooltip);

		// Add event listeners
		u.over.addEventListener('mouseenter', () => {
			isMouseOverPlot = true;
		});

		u.over.addEventListener('mouseleave', () => {
			isMouseOverPlot = false;
			tooltip.style.display = 'none';
		});

		u.over.addEventListener('mousemove', (e: MouseEvent) => {
			if (isMouseOverPlot) {
				const rect = u.over.getBoundingClientRect();
				const left = e.clientX - rect.left;
				const top = e.clientY - rect.top;
				updateTooltip(u, left, top);
			}
		});
	}

	return {
		hooks: {
			init,
		},
	};
};

export default tooltipPlugin;
