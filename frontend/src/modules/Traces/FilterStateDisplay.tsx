import React from 'react';
import { Card, Tag as AntTag } from 'antd';
import { connect } from 'react-redux';

import styled from 'styled-components';
import { StoreState } from '../../store/reducers';
import { TagItem, TraceFilters, updateTraceFilters } from '../../store/actions';


const Tag = styled(AntTag)`
	.anticon {
		position: relative;
		top: -3px;
	}
`;

interface FilterStateDisplayProps {
	traceFilters: TraceFilters;
	updateTraceFilters: Function;
}

const _FilterStateDisplay = (props: FilterStateDisplayProps) => {
	function handleCloseTag(value: string) {
		if (value === 'service')
			props.updateTraceFilters({ ...props.traceFilters, service: '' });
		if (value === 'operation')
			props.updateTraceFilters({ ...props.traceFilters, operation: '' });
		if (value === 'maxLatency')
			props.updateTraceFilters({
				...props.traceFilters,
				latency: { max: '', min: props.traceFilters.latency?.min },
			});
		if (value === 'minLatency')
			props.updateTraceFilters({
				...props.traceFilters,
				latency: { min: '', max: props.traceFilters.latency?.max },
			});
	}

	function handleCloseTagElement(item: TagItem) {
		props.updateTraceFilters({
			...props.traceFilters,
			tags: props.traceFilters.tags?.filter((elem) => elem !== item),
		});
	}
	return (
		<Card
			style={{ padding: 6, marginTop: 10, marginBottom: 10 }}
			bodyStyle={{ padding: 6 }}
		>
			{props.traceFilters.service === '' ||
			props.traceFilters.operation === undefined ? null : (
					<Tag
						style={{ fontSize: 14, padding: 8 }}
						closable
						onClose={(e) => {
							handleCloseTag('service');
						}}
					>
					service:{props.traceFilters.service}
					</Tag>
				)}
			{props.traceFilters.operation === '' ||
			props.traceFilters.operation === undefined ? null : (
					<Tag
						style={{ fontSize: 14, padding: 8 }}
						closable
						onClose={(e) => {
							handleCloseTag('operation');
						}}
					>
					operation:{props.traceFilters.operation}
					</Tag>
				)}
			{props.traceFilters.latency === undefined ||
			props.traceFilters.latency?.min === '' ? null : (
					<Tag
						style={{ fontSize: 14, padding: 8 }}
						closable
						onClose={(e) => {
							handleCloseTag('minLatency');
						}}
					>
					minLatency:
						{(parseInt(props.traceFilters.latency!.min) / 1000000).toString()}ms
					</Tag>
				)}
			{props.traceFilters.latency === undefined ||
			props.traceFilters.latency?.max === '' ? null : (
					<Tag
						style={{ fontSize: 14, padding: 8 }}
						closable
						onClose={(e) => {
							handleCloseTag('maxLatency');
						}}
					>
					maxLatency:
						{(parseInt(props.traceFilters.latency!.max) / 1000000).toString()}ms
					</Tag>
				)}
			{props.traceFilters.tags === undefined
				? null
				: props.traceFilters.tags.map((item) => (
					<Tag
						style={{ fontSize: 14, padding: 8 }}
						closable
						key={`${item.key}-${item.operator}-${item.value}`}
						onClose={(e) => {
							handleCloseTagElement(item);
						}}
					>
						{item.key} {item.operator} {item.value}
					</Tag>
				  ))}
		</Card>
	);
};

const mapStateToProps = (state: StoreState): { traceFilters: TraceFilters } => {
	return { traceFilters: state.traceFilters };
};

export const FilterStateDisplay = connect(mapStateToProps, {
	updateTraceFilters: updateTraceFilters,
})(_FilterStateDisplay);
