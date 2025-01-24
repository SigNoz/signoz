import './Attributes.styles.scss';

import { Input, Tooltip, Typography } from 'antd';
import { flattenObject } from 'container/LogDetailedView/utils';
import { useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

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
			{isSearchVisible && (
				<Input
					autoFocus
					placeholder="Search for attribute..."
					className="search-input"
					value={fieldSearchInput}
					onChange={(e): void => setFieldSearchInput(e.target.value)}
				/>
			)}
			<section className="attributes-container">
				{datasource.map((item) => (
					<div className="item" key={`${item.field} + ${item.value}`}>
						<Typography.Text className="item-key" ellipsis>
							{item.field}
						</Typography.Text>
						<Tooltip title={item.value}>
							<Typography.Text className="item-value" ellipsis>
								{item.value}
							</Typography.Text>
						</Tooltip>
					</div>
				))}
			</section>
		</div>
	);
}

export default Attributes;
