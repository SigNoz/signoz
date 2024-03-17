import './ResourceAttributesFilter.styles.scss';

import { CloseCircleFilled } from '@ant-design/icons';
import { Button, Select, Spin } from 'antd';
import useResourceAttribute, {
	isResourceEmpty,
} from 'hooks/useResourceAttribute';
import {
	convertMetricKeyToTrace,
	getEnvironmentTagKeys,
	getEnvironmentTagValues,
} from 'hooks/useResourceAttribute/utils';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';
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
		handleEnvironmentChange,
		handleEnvironmentSelectorFocus,
		selectedQuery,
		optionsData,
		loading,
	} = useResourceAttribute();

	const [environments, setEnvironments] = useState<
		SelectOption<string, string>[]
	>([]);

	const [selectedEnvironments, setSelectedEnvironments] = useState([]);

	const isEmpty = useMemo(
		() => isResourceEmpty(queries, staging, selectedQuery),
		[queries, selectedQuery, staging],
	);

	useEffect(() => {
		getEnvironmentTagKeys()
			.then((tagKeys) => {
				if (tagKeys && Array.isArray(tagKeys) && tagKeys.length > 0) {
					getEnvironmentTagValues().then((tagValues) => {
						setEnvironments(tagValues);
					});
				}
			})
			.finally(() => {});
	}, []);

	return (
		<div className="resourceAttributesFilter-container">
			<div className="environment-selector">
				<Select
					showSearch
					mode="multiple"
					style={{ minWidth: 200 }}
					placeholder="Select Environment/s"
					options={environments}
					onChange={handleEnvironmentChange}
					onBlur={handleBlur}
					onFocus={handleEnvironmentSelectorFocus}
				/>
			</div>

			<div className="resource-attributes-selector">
				<SearchContainer>
					<div>
						{queries.map((query) => (
							// if (query.tagKey === 'resource_deployment_environment') {
							// 	return null;
							// }

							<QueryChip key={query.id} queryData={query} onClose={handleClose} />
						))}
						{staging.map((query, idx) => (
							<QueryChipItem key={uuid()}>
								{idx === 0 ? convertMetricKeyToTrace(query) : query}
							</QueryChipItem>
						))}
					</div>
					<Select
						getPopupContainer={popupContainer}
						placeholder={
							!isEmpty && 'Search and Filter based on resource attributes.'
						}
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
						<Button
							onClick={handleClearAll}
							icon={<CloseCircleFilled />}
							type="text"
						/>
					) : null}
				</SearchContainer>
			</div>
		</div>
	);
}

interface ResourceAttributesFilterProps {
	suffixIcon?: ReactNode;
}

ResourceAttributesFilter.defaultProps = {
	suffixIcon: undefined,
};

export default ResourceAttributesFilter;
