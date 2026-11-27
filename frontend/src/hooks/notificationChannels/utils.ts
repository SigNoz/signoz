import type { ChannelOption } from './useChannelOptions';

/**
 * Ids of the named channels. Rules name their channels and permission checks
 * need ids; a name the list lacks is a deleted channel, which the backend skips
 * too.
 */
export function getChannelIds(
	channels: ChannelOption[],
	names: string[],
): string[] {
	const idByName = new Map(channels.map(({ id, name }) => [name, id]));
	return names.flatMap((name) => idByName.get(name) ?? []);
}
