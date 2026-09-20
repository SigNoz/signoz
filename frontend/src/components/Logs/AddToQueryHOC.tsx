import { memo, MouseEvent, useMemo } from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import { OPERATORS } from 'constants/queryBuilder';
import { AddToQueryHOCProps } from 'container/LogDetailedView/LogDetailedView.types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import './AddToQueryHOC.styles.scss';

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

	const popOverContent = useMemo(
		() => <span>Add to query: {fieldKey}</span>,
		[fieldKey],
	);

	return (
		<div className={cx('addToQueryContainer', fontSize)} onClick={handleQueryAdd}>
			<Popover
				overlayClassName="drawer-popover"
				placement="top"
				content={popOverContent}
			>
				{children}
			</Popover>
		</div>
	);
}

export type { AddToQueryHOCProps };

AddToQueryHOC.defaultProps = {
	dataType: DataTypes.EMPTY,
};

export default memo(AddToQueryHOC);
