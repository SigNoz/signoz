import { Input } from 'antd';
import useClickOutside from 'hooks/useClickOutside';
import React, { useRef, useState } from 'react';
import { useClickAway } from 'react-use';

import SearchFields from './SearchFields';
import { DropDownContainer } from './styles';
import { useSearchParser } from './useSearchParser';

const { Search } = Input;

function SearchFilter() {
	const {
		queryString,
		updateParsedQuery,
		updateQueryString,
	} = useSearchParser();
	const [showDropDown, setShowDropDown] = useState(true);

	const searchComponentRef = useRef<HTMLDivElement>(null);

	useClickOutside(searchComponentRef, (e: HTMLElement) => {
		// using this hack as overlay span is voilating this condition
		if (
			e.nodeName === 'svg' ||
			e.nodeName === 'path' ||
			e.nodeName === 'span' ||
			e.nodeName === 'button'
		) {
			return;
		}

		if (
			e.nodeName === 'DIV' &&
			![
				'ant-select-item-option-content',
				'ant-empty-image',
				'ant-select-item',
				'ant-col',
				'ant-select-item-option-active',
			].find((p) => p.indexOf(e.className) !== -1) &&
			!(e.ariaSelected === 'true') &&
			showDropDown
		) {
			setShowDropDown(false);
		}
	});
	return (
		<div ref={searchComponentRef}>
			<Search
				placeholder="Search Filter"
				onFocus={(): void => setShowDropDown(true)}
				value={queryString}
				onChange={(e): void => updateQueryString(e.target.value)}
			/>
			<div style={{ position: 'relative' }}>
				{showDropDown && (
					<DropDownContainer>
						<SearchFields updateParsedQuery={updateParsedQuery} />
					</DropDownContainer>
				)}
			</div>
		</div>
	);
}

export default SearchFilter;
