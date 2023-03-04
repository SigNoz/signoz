import { Typography } from 'antd';
import { timeItems } from 'container/NewWidget/RightContainer/timeItems';
import React from 'react';

export const menuItems = timeItems.map((item) => ({
	key: item.enum,
	label: <Typography>{item.name}</Typography>,
}));
