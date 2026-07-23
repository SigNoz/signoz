import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SolidXCircle } from '@signozhq/icons';
import { Button, Select, Spin } from 'antd';
import useResourceAttribute, {
	isResourceEmpty,
} from 'hooks/useResourceAttribute';
import {
	convertMetricKeyToTrace,
	getEnvironmentTagKeys,
	getEnvironmentTagValues,
	isEnvironmentMetricResourceKey,
} from 'hooks/useResourceAttribute/utils';
import { SelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';
import { v4 as uuid } from 'uuid';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import QueryChip from './components/QueryChip';
import { QueryChipItem, SearchContainer } from './styles';

import './ResourceAttributesFilter.styles.scss';

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
	const [environmentResourceKey, setEnvironmentResourceKey] = useState<
		string | null
	>(null);
	const [knownEnvironmentMetricKeys, setKnownEnvironmentMetricKeys] = useState<
		string[]
	>([]);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);

	const queriesExcludingEnvironment = useMemo(
		() =>
			queries.filter(
				(query) =>
					!isEnvironmentMetricResourceKey(query.tagKey, knownEnvironmentMetricKeys),
			),
		[queries, knownEnvironmentMetricKeys],
	);

	const isEmpty = useMemo(
		() => isResourceEmpty(queriesExcludingEnvironment, staging, selectedQuery),
		[queriesExcludingEnvironment, selectedQuery, staging],
	);
	useEffect(() => {
		const resourceDeploymentEnvironmentQuery = queries.find((query) =>
			isEnvironmentMetricResourceKey(query.tagKey, knownEnvironmentMetricKeys),
		);

		if (resourceDeploymentEnvironmentQuery) {
			setSelectedEnvironments(resourceDeploymentEnvironmentQuery.tagValue);
		} else {
			setSelectedEnvironments([]);
		}
	}, [queries, knownEnvironmentMetricKeys]);

	useEffect(() => {
		getEnvironmentTagKeys(dotMetricsEnabled).then((tagKeys) => {
			const metricKeys = tagKeys.map((tagKey) => tagKey.value);
			setKnownEnvironmentMetricKeys(metricKeys);

			if (tagKeys && Array.isArray(tagKeys) && tagKeys.length > 0) {
				const resolvedKey = tagKeys[0].value;
				setEnvironmentResourceKey(resolvedKey);
				getEnvironmentTagValues(dotMetricsEnabled, resolvedKey).then((tagValues) => {
					setEnvironments(tagValues);
				});
				return;
			}

			setEnvironmentResourceKey(null);
			setEnvironments([]);
		});
	}, [dotMetricsEnabled]);

	const showEnvironmentSelector =
		environments.length > 0 && environmentResourceKey !== null;

	return (
		<div className="resourceAttributesFilter-container">
			{showEnvironmentSelector ? (
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
					>
						{environments.map((opt) => (
							<Select.Option key={opt.value} value={opt.value}>
								{opt.label}
							</Select.Option>
						))}
					</Select>
				</div>
			) : null}

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
							icon={<SolidXCircle size="lg" />}
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
