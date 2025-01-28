import './Attributes.styles.scss';

import { Input, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { flattenObject } from 'container/LogDetailedView/utils';
import { useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';

interface IAttributesProps {
	span: Span;
	isSearchVisible: boolean;
}

function Attributes(props: IAttributesProps): JSX.Element {
	const { span, isSearchVisible } = props;
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenSpanData: Record<string, string> = useMemo(
		() => (span.tagMap ? flattenObject(span.tagMap) : {}),
		[span],
	);

	const datasource = Object.keys(flattenSpanData)
		.filter((attribute) =>
			attribute.toLowerCase().includes(fieldSearchInput.toLowerCase()),
		)
		.map((key) => ({ field: key, value: flattenSpanData[key] }));

	return (
		<div className="attributes-corner">
			{isSearchVisible &&
				(datasource.length > 0 || fieldSearchInput.length > 0) && (
					<Input
						autoFocus
						placeholder="Search for attribute..."
						className="search-input"
						value={fieldSearchInput}
						onChange={(e): void => setFieldSearchInput(e.target.value)}
					/>
				)}
			{datasource.length === 0 && fieldSearchInput.length === 0 && (
				<NoData name="attributes" />
			)}
			<section
				className={cx('attributes-container', isSearchVisible ? 'border-top' : '')}
			>
				{datasource.map((item) => (
					<div className="item" key={`${item.field} + ${item.value}`}>
						<Typography.Text className="item-key" ellipsis>
							{item.field}
						</Typography.Text>
						<div className="value-wrapper">
							<Tooltip title={item.value}>
								<Typography.Text className="item-value" ellipsis>
									{item.value}
								</Typography.Text>
							</Tooltip>
						</div>
					</div>
				))}
			</section>
		</div>
	);
}

export default Attributes;
