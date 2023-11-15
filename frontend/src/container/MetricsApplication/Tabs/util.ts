import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import history from 'lib/history';
import { Dispatch, SetStateAction } from 'react';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { Tags } from 'types/reducer/trace';

export const dbSystemTags: Tags[] = [
	{
		Key: 'db.system.(string)',
		StringValues: [''],
		NumberValues: [],
		BoolValues: [],
		Operator: 'Exists',
	},
];

interface OnViewTracePopupClickProps {
	servicename: string | undefined;
	selectedTraceTags: string;
	timestamp: number;
	isExternalCall?: boolean;
}
export function onViewTracePopupClick({
	selectedTraceTags,
	servicename,
	timestamp,
	isExternalCall,
}: OnViewTracePopupClickProps): VoidFunction {
	return (): void => {
		const currentTime = timestamp;

		const tPlusOne = timestamp + 60;

		const urlParams = new URLSearchParams(window.location.search);
		urlParams.set(QueryParams.startTime, currentTime.toString());
		urlParams.set(QueryParams.endTime, tPlusOne.toString());
		const avialableParams = routeConfig[ROUTES.TRACE];
		const queryString = getQueryString(avialableParams, urlParams);

		history.replace(
			`${
				ROUTES.TRACE
			}?${urlParams.toString()}&selected={"serviceName":["${servicename}"]}&filterToFetchData=["duration","status","serviceName"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&&isFilterExclude={"serviceName":false}&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"]}&spanAggregateCurrentPage=1${
				isExternalCall ? '&spanKind=3' : ''
			}&${queryString.join('&')}`,
		);
	};
}

export function onGraphClickHandler(
	setSelectedTimeStamp: (n: number) => void | Dispatch<SetStateAction<number>>,
) {
	return async (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		type: string,
	): Promise<void> => {
		const id = `${type}_button`;

		const buttonElement = document.getElementById(id);

		if (xValue) {
			if (buttonElement) {
				buttonElement.style.display = 'block';
				buttonElement.style.left = `${mouseX}px`;
				buttonElement.style.top = `${mouseY}px`;
				setSelectedTimeStamp(xValue);
			}
		} else if (buttonElement && buttonElement.style.display === 'block') {
			buttonElement.style.display = 'none';
		}
	};
}

export const handleNonInQueryRange = (tags: TagFilterItem[]): TagFilterItem[] =>
	tags.map((tag) => {
		if (tag.op === 'Not IN') {
			return {
				...tag,
				op: 'NIN',
			};
		}
		return tag;
	});
