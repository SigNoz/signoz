import { Col, Row, Select } from 'antd';
import { QueryParams } from 'constants/query';
import {
	defaultSelectStyle,
	ITEMS_PER_PAGE_OPTIONS,
} from 'container/Controls/config';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback } from 'react';

import { PageSizeSelectProps } from './PageSizeSelect.interfaces';

function PageSizeSelect({
	isLoading,
	isShow,
}: PageSizeSelectProps): JSX.Element | null {
	const { redirectWithQuery, queryData: pageSize } = useUrlQueryData<number>(
		QueryParams.pageSize,
		ITEMS_PER_PAGE_OPTIONS[0],
	);

	const handleChangePageSize = useCallback(
		(value: number) => {
			redirectWithQuery(value);
		},
		[redirectWithQuery],
	);

	if (!isShow) return null;

	return (
		<Row>
			<Col>
				<Select
					style={defaultSelectStyle}
					loading={isLoading}
					value={pageSize}
					onChange={handleChangePageSize}
				>
					{ITEMS_PER_PAGE_OPTIONS.map((count) => (
						<Select.Option
							key={count}
							value={count}
						>{`${count} / page`}</Select.Option>
					))}
				</Select>
			</Col>
		</Row>
	);
}

export default PageSizeSelect;
