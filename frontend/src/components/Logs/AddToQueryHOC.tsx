import './AddToQueryHOC.styles.scss';

import { Popover } from 'antd';
import cx from 'classnames';
import { OPERATORS } from 'constants/queryBuilder';
import { FontSize } from 'container/OptionsMenu/types';
import { memo, MouseEvent, ReactNode, useMemo } from 'react';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	onAddToQuery,
	fontSize,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const handleQueryAdd = (event: MouseEvent<HTMLDivElement>): void => {
		event.stopPropagation();
		onAddToQuery(fieldKey, fieldValue, OPERATORS['=']);
	};

	const popOverContent = useMemo(() => <span>Add to query: {fieldKey}</span>, [
		fieldKey,
	]);

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className={cx('addToQueryContainer', fontSize)} onClick={handleQueryAdd}>
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
	fontSize: FontSize;
	children: ReactNode;
}

export default memo(AddToQueryHOC);
