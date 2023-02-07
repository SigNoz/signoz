import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import history from 'lib/history';

export function onViewTracePopupClick(
	servicename: string | undefined,
	selectedTraceTags: string,
	timestamp: number,
): void {
	const currentTime = timestamp;
	const tPlusOne = timestamp + 1 * 60 * 1000;

	const urlParams = new URLSearchParams();
	urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
	urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());

	history.replace(
		`${
			ROUTES.TRACE
		}?${urlParams.toString()}&selected={"serviceName":["${servicename}"]}&filterToFetchData=["duration","status","serviceName"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&&isFilterExclude={"serviceName":false}&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"]}&spanAggregateCurrentPage=1`,
	);
}

export function onGraphClickHandler(
	selectedTimeStamp: React.MutableRefObject<number>,
) {
	return async (
		event: ChartEvent,
		elements: ActiveElement[],
		chart: Chart,
		data: ChartData,
		from: string,
	): Promise<void> => {
		if (event.native) {
			const points = chart.getElementsAtEventForMode(
				event.native,
				'nearest',
				{ intersect: true },
				true,
			);
			const id = `${from}_button`;
			const buttonElement = document.getElementById(id);

			if (points.length !== 0) {
				const firstPoint = points[0];

				if (data.labels) {
					const time = data?.labels[firstPoint.index] as Date;
					const selectedTime = selectedTimeStamp;
					if (buttonElement) {
						buttonElement.style.display = 'block';
						buttonElement.style.left = `${firstPoint.element.x}px`;
						buttonElement.style.top = `${firstPoint.element.y}px`;
						selectedTime.current = time.getTime();
					}
				}
			} else if (buttonElement && buttonElement.style.display === 'block') {
				buttonElement.style.display = 'none';
			}
		}
	};
}
