import { Card, Tag as AntTag } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { TagItem, TraceFilters, updateTraceFilters } from 'store/actions';
import { AppState } from 'store/reducers';
import styled from 'styled-components';

const Tag = styled(AntTag)`
	.anticon {
		position: relative;
		top: -3px;
	}
`;

interface FilterStateDisplayProps {
	traceFilters: TraceFilters;
	updateTraceFilters: (props: TraceFilters) => void;
}

const _FilterStateDisplay = (props: FilterStateDisplayProps): JSX.Element => {
	const { traceFilters, updateTraceFilters } = props;

	function handleCloseTag(value: string): void {
		if (value === 'service') {
			updateTraceFilters({ ...traceFilters, service: '' });
		}
		if (value === 'operation') {
			updateTraceFilters({ ...traceFilters, operation: '' });
		}
		if (value === 'maxLatency') {
			updateTraceFilters({
				...traceFilters,
				latency: { max: '', min: traceFilters.latency?.min || '' },
			});
		}
		if (value === 'minLatency') {
			updateTraceFilters({
				...traceFilters,
				latency: { min: '', max: traceFilters.latency?.max || '' },
			});
		}
	}

	function handleCloseTagElement(item: TagItem): void {
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
					onClose={(): void => {
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
					onClose={(): void => {
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
					onClose={(): void => {
						handleCloseTag('minLatency');
					}}
				>
					minLatency:
					{(parseInt(traceFilters?.latency?.min || '0') / 1000000).toString()}ms
				</Tag>
			)}
			{props.traceFilters.latency === undefined ||
			props.traceFilters.latency?.max === '' ? null : (
				<Tag
					style={{ fontSize: 14, padding: 8 }}
					closable
					onClose={(): void => {
						handleCloseTag('maxLatency');
					}}
				>
					maxLatency:
					{(parseInt(traceFilters?.latency?.max || '0') / 1000000).toString()}ms
				</Tag>
			)}
			{props.traceFilters.tags === undefined
				? null
				: props.traceFilters.tags.map((item) => (
						<Tag
							style={{ fontSize: 14, padding: 8 }}
							closable
							key={`${item.key}-${item.operator}-${item.value}`}
							onClose={(): void => {
								handleCloseTagElement(item);
							}}
						>
							{item.key} {item.operator} {item.value}
						</Tag>
				  ))}
		</Card>
	);
};

const mapStateToProps = (state: AppState): { traceFilters: TraceFilters } => {
	return { traceFilters: state.traceFilters };
};

export const FilterStateDisplay = connect(mapStateToProps, {
	updateTraceFilters: updateTraceFilters,
})(_FilterStateDisplay);
