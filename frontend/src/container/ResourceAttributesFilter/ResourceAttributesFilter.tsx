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
		selectedQuery,
		optionsData,
		loading,
	} = useResourceAttribute();

	const [environments, setEnvironments] = useState<
		SelectOption<string, string>[]
	>([]);

	const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);

	const queriesExcludingEnvironment = useMemo(
		() =>
			queries.filter(
				(query) => query.tagKey !== 'resource_deployment_environment',
			),
		[queries],
	);

	const isEmpty = useMemo(
		() => isResourceEmpty(queriesExcludingEnvironment, staging, selectedQuery),
		[queriesExcludingEnvironment, selectedQuery, staging],
	);

	useEffect(() => {
		const resourceDeploymentEnvironmentQuery = queries.filter(
			(query) => query.tagKey === 'resource_deployment_environment',
		);

		if (resourceDeploymentEnvironmentQuery?.length > 0) {
			setSelectedEnvironments(resourceDeploymentEnvironmentQuery[0].tagValue);
		} else {
			setSelectedEnvironments([]);
		}
	}, [queries]);

	useEffect(() => {
		getEnvironmentTagKeys().then((tagKeys) => {
			if (tagKeys && Array.isArray(tagKeys) && tagKeys.length > 0) {
				getEnvironmentTagValues().then((tagValues) => {
					setEnvironments(tagValues);
				});
			}
		});
	}, []);

	return (
		<div className="resourceAttributesFilter-container">
			<div className="environment-selector">
				<Select
					getPopupContainer={popupContainer}
					key={selectedEnvironments.join('')}
					showSearch
					mode="multiple"
					value={selectedEnvironments}
					placeholder="Select Environment/s"
					data-testid="resource-environment-filter"
					style={{ minWidth: 200, height: 34 }}
					onChange={handleEnvironmentChange}
					onBlur={handleBlur}
				>
					{environments.map((opt) => (
						<Select.Option key={opt.value} value={opt.value}>
							{opt.label}
						</Select.Option>
					))}
				</Select>
			</div>

			<div className="resource-attributes-selector">
				<SearchContainer>
					<div>
						{queriesExcludingEnvironment.map((query) => (
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
						data-testid="resource-attributes-filter"
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
