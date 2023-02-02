import { Input } from 'antd';
import React from 'react';

function PiplinesSearchBar(): JSX.Element {
	return <Input.Search placeholder="Filter Pipelines" allowClear />;
}

export default PiplinesSearchBar;
