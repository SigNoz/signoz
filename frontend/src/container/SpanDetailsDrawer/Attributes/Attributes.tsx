import './Attributes.styles.scss';

import { Input, Typography } from 'antd';
import cx from 'classnames';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { flattenObject } from 'container/LogDetailedView/utils';
import { usePinnedAttributes } from 'hooks/spanDetails/usePinnedAttributes';
import { Pin } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';
import AttributeActions from './AttributeActions';

interface AttributeRecord {
	field: string;
	value: string;
}

interface IAttributesProps {
	span: Span;
	isSearchVisible: boolean;
	shouldFocusOnToggle?: boolean;
}

function Attributes(props: IAttributesProps): JSX.Element {
	const { span, isSearchVisible, shouldFocusOnToggle } = props;
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenSpanData: Record<string, string> = useMemo(
		() => (span.tagMap ? flattenObject(span.tagMap) : {}),
		[span],
	);

	const availableAttributes = useMemo(() => Object.keys(flattenSpanData), [
		flattenSpanData,
	]);

	const { pinnedAttributes, togglePin } = usePinnedAttributes(
		availableAttributes,
	);

	const sortPinnedAttributes = useCallback(
		(data: AttributeRecord[]): AttributeRecord[] =>
			data.sort((a, b) => {
				const aIsPinned = pinnedAttributes[a.field];
				const bIsPinned = pinnedAttributes[b.field];

				if (aIsPinned && !bIsPinned) return -1;
				if (!aIsPinned && bIsPinned) return 1;

				// Within same pinning status, maintain alphabetical order
				return a.field.localeCompare(b.field);
			}),
		[pinnedAttributes],
	);

	const datasource = useMemo(() => {
		const filtered = Object.keys(flattenSpanData)
			.filter((attribute) =>
				attribute.toLowerCase().includes(fieldSearchInput.toLowerCase()),
			)
			.map((key) => ({ field: key, value: flattenSpanData[key] }));

		return sortPinnedAttributes(filtered);
	}, [flattenSpanData, fieldSearchInput, sortPinnedAttributes]);

	return (
		<div className="attributes-corner">
			{isSearchVisible &&
				(datasource.length > 0 || fieldSearchInput.length > 0) && (
					<Input
						autoFocus={shouldFocusOnToggle}
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
				{datasource
					.filter((item) => !!item.value && item.value !== '-')
					.map((item) => (
						<div
							className={cx('item', { pinned: pinnedAttributes[item.field] })}
							key={`${item.field} + ${item.value}`}
						>
							<div className="item-key-wrapper">
								<Typography.Text className="item-key" ellipsis>
									{item.field}
								</Typography.Text>
								{pinnedAttributes[item.field] && (
									<Pin size={14} className="pin-icon" fill="currentColor" />
								)}
							</div>
							<div className="value-wrapper">
								<div className="copy-wrapper">
									<CopyClipboardHOC
										entityKey={item.value}
										textToCopy={item.value}
										tooltipText={item.value}
									>
										<Typography.Text className="item-value" ellipsis>
											{item.value}
										</Typography.Text>
									</CopyClipboardHOC>
								</div>
								<AttributeActions
									record={item}
									isPinned={pinnedAttributes[item.field]}
									onTogglePin={togglePin}
								/>
							</div>
						</div>
					))}
			</section>
		</div>
	);
}

Attributes.defaultProps = {
	shouldFocusOnToggle: false,
};

export default Attributes;
