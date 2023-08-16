import { Popover } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { memo, ReactNode, useCallback, useMemo } from 'react';

import { ButtonContainer } from './styles';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	onAddToQuery,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const handleQueryAdd = useCallback(() => {
		onAddToQuery(fieldKey, fieldValue, OPERATORS.IN);
	}, [fieldKey, fieldValue, onAddToQuery]);

	const popOverContent = useMemo(() => <span>Add to query: {fieldKey}</span>, [
		fieldKey,
	]);

	return (
		<ButtonContainer size="small" type="text" onClick={handleQueryAdd}>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</ButtonContainer>
	);
}

export interface AddToQueryHOCProps {
	fieldKey: string;
	fieldValue: string;
	onAddToQuery: (fieldKey: string, fieldValue: string, operator: string) => void;
	children: ReactNode;
}

export default memo(AddToQueryHOC);
