import { ChannelType } from './config';

export const isChannelType = (type: string): type is ChannelType =>
	Object.values(ChannelType).includes(type as ChannelType);
