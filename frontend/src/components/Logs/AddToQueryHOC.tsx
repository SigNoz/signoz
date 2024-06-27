import './AddToQueryHOC.styles.scss';

import { Popover } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { memo, MouseEvent, ReactNode, useMemo } from 'react';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	onAddToQuery,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const handleQueryAdd = (event: MouseEvent<HTMLDivElement>): void => {
		event.stopPropagation();
		onAddToQuery(fieldKey, fieldValue, OPERATORS.IN);
	};

	const popOverContent = useMemo(() => <span>Add to query: {fieldKey}</span>, [
		fieldKey,
	]);

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className="addToQueryContainer" onClick={handleQueryAdd}>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</div>
	);
}

export interface AddToQueryHOCProps {
	fieldKey: string;
	fieldValue: string;
	onAddToQuery: (fieldKey: string, fieldValue: string, operator: string) => void;
	children: ReactNode;
}

export default memo(AddToQueryHOC);
