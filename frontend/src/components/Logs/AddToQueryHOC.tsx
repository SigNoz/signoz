import './AddToQueryHOC.styles.scss';

import { Popover } from 'antd';
import cx from 'classnames';
import { OPERATORS } from 'constants/queryBuilder';
import { FontSize } from 'container/OptionsMenu/types';
import { memo, MouseEvent, ReactNode, useMemo } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	onAddToQuery,
	fontSize,
	dataType = DataTypes.EMPTY,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const handleQueryAdd = (event: MouseEvent<HTMLDivElement>): void => {
		event.stopPropagation();
		onAddToQuery(fieldKey, fieldValue, OPERATORS['='], dataType);
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
	onAddToQuery: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
		dataType?: DataTypes,
	) => void;
	fontSize: FontSize;
	dataType?: DataTypes;
	children: ReactNode;
}

AddToQueryHOC.defaultProps = {
	dataType: DataTypes.EMPTY,
};

export default memo(AddToQueryHOC);
