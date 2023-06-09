import { CloseCircleFilled } from '@ant-design/icons';
import { Button, Select, Spin } from 'antd';
import useResourceAttribute, {
	isResourceEmpty,
} from 'hooks/useResourceAttribute';
import { convertMetricKeyToTrace } from 'hooks/useResourceAttribute/utils';
import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';

import QueryChip from './components/QueryChip';
import { QueryChipItem, SearchContainer } from './styles';

function ResourceAttributesFilter({
	suffixIcon,
}: ResourceAttributesFilterProps): JSX.Element | null {
	const {
		queries,
		staging,
		handleClose,
		handleBlur,
		handleClearAll,
		handleFocus,
		handleChange,
		selectedQuery,
		optionsData,
		loading,
	} = useResourceAttribute();

	const isEmpty = useMemo(
		() => isResourceEmpty(queries, staging, selectedQuery),
		[queries, selectedQuery, staging],
	);

	return (
		<SearchContainer>
			<div>
				{queries.map((query) => (
					<QueryChip key={query.id} queryData={query} onClose={handleClose} />
				))}
				{staging.map((query, idx) => (
					<QueryChipItem key={uuid()}>
						{idx === 0 ? convertMetricKeyToTrace(query) : query}
					</QueryChipItem>
				))}
			</div>
			<Select
				placeholder={!isEmpty && 'Search and Filter based on resource attributes.'}
				onChange={handleChange}
				bordered={false}
				value={selectedQuery as never}
				style={{ flex: 1 }}
				options={optionsData.options}
				mode={optionsData?.mode}
				showArrow={!!suffixIcon}
				onClick={handleFocus}
				onBlur={handleBlur}
				onClear={handleClearAll}
				suffixIcon={suffixIcon}
				notFoundContent={
					loading ? (
						<span>
							<Spin size="small" /> Loading...
						</span>
					) : (
						<span>
							No resource attributes available to filter. Please refer docs to send
							attributes.
						</span>
					)
				}
			/>

			{queries.length || staging.length || selectedQuery.length ? (
				<Button onClick={handleClearAll} icon={<CloseCircleFilled />} type="text" />
			) : null}
		</SearchContainer>
	);
}

interface ResourceAttributesFilterProps {
	suffixIcon?: React.ReactNode;
}

ResourceAttributesFilter.defaultProps = {
	suffixIcon: undefined,
};

export default ResourceAttributesFilter;
