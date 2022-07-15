import { Input } from 'antd';
import React, { useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import SearchFields from './SearchFields';

import { DropDownContainer } from './styles';

const { Search } = Input;

function SearchFilter() {
	const [showDropDown, setShowDropDown] = useState(false);

	const searchComponentRef = useRef(null);

	useClickAway(searchComponentRef, () => {
		setShowDropDown(false);
	});

	return (
		<div ref={searchComponentRef}>
			<Search placeholder="Search Filter" onFocus={() => setShowDropDown(true)} />
			<div style={{ position: 'relative' }}>
				{showDropDown && (
					<DropDownContainer>
						<SearchFields />
					</DropDownContainer>
				)}
			</div>
		</div>
	);
}

export default SearchFilter;
