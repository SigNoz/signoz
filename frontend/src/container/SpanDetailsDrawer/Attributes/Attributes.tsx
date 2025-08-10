import './Attributes.styles.scss';

import { Input } from 'antd';
import cx from 'classnames';
import { flattenObject } from 'container/LogDetailedView/utils';
import { useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';
import SpanTableView from './SpanTableView';

interface IAttributesProps {
	span: Span;
	isSearchVisible: boolean;
	onAddToQuery: (key: string, value: string, operator: string) => void;
	onGroupByAttribute: (fieldKey: string) => void;
	onCopyFieldName: (fieldName: string) => void;
	onCopyFieldValue: (fieldValue: string) => void;
}

function Attributes(props: IAttributesProps): JSX.Element {
	const {
		span,
		isSearchVisible,
		onAddToQuery,
		onGroupByAttribute,
		onCopyFieldName,
		onCopyFieldValue,
	} = props;
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenSpanData: Record<string, string> = useMemo(
		() => (span.tagMap ? flattenObject(span.tagMap) : {}),
		[span],
	);

	const hasAttributes = Object.keys(flattenSpanData).length > 0;

	return (
		<div className="attributes-corner">
			{isSearchVisible && hasAttributes && (
				<Input
					autoFocus
					placeholder="Search for attribute..."
					className="search-input"
					value={fieldSearchInput}
					onChange={(e): void => setFieldSearchInput(e.target.value)}
				/>
			)}
			{!hasAttributes && <NoData name="attributes" />}
			{hasAttributes && (
				<section
					className={cx('attributes-container', isSearchVisible ? 'border-top' : '')}
				>
					<SpanTableView
						span={span}
						fieldSearchInput={fieldSearchInput}
						onAddToQuery={onAddToQuery}
						onGroupByAttribute={onGroupByAttribute}
						onCopyFieldName={onCopyFieldName}
						onCopyFieldValue={onCopyFieldValue}
					/>
				</section>
			)}
		</div>
	);
}

export default Attributes;
