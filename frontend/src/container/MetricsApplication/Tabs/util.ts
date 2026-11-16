import { Dispatch, SetStateAction, useRef } from 'react';
import useClickOutside from 'hooks/useClickOutside';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export function useGraphClickHandler(
	setSelectedTimeStamp: (n: number) => void | Dispatch<SetStateAction<number>>,
	setSelectedData?: (data: any) => void | Dispatch<SetStateAction<any>>,
): (
	xValue: number,
	yValue: number,
	mouseX: number,
	mouseY: number,
	type: string,
	data?: any,
) => Promise<void> {
	const buttonRef = useRef<HTMLElement | null>(null);

	useClickOutside({
		ref: buttonRef,
		onClickOutside: () => {
			if (buttonRef.current) {
				buttonRef.current.style.display = 'none';
			}
		},
		eventType: 'mousedown',
	});

	return async (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		type: string,
		data?: any,
	): Promise<void> => {
		const id = `${type}_button`;
		const buttonElement = document.getElementById(id);
		buttonRef.current = buttonElement;

		if (xValue) {
			if (buttonElement) {
				buttonElement.style.display = 'block';
				buttonElement.style.left = `${mouseX}px`;
				buttonElement.style.top = `${mouseY}px`;
				setSelectedTimeStamp(Math.floor(xValue));
				if (setSelectedData && data) {
					setSelectedData(data);
				}
			}
		} else if (buttonElement && buttonElement.style.display === 'block') {
			buttonElement.style.display = 'none';
		}
	};
}

export function handleQueryChange(
	query: Query,
	attributeKeys: BaseAutocompleteData,
	serviceAttribute: string,
	filters?: TagFilterItem[],
	logs?: boolean,
): Query {
	const filterItem: TagFilterItem[] = [
		{
			id: uuid().slice(0, 8),
			key: attributeKeys,
			op: logs ? '=' : 'in',
			value: serviceAttribute,
		},
	];
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData?.map((item) => ({
				...item,
				filters: {
					...item.filters,
					items: [...(item.filters?.items || []), ...filterItem, ...(filters || [])],
					op: item.filters?.op || 'AND',
				},
			})),
		},
	};
}
