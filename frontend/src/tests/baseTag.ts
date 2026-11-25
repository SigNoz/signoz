const baseTags: HTMLBaseElement[] = [];

export function addBaseTag(href: string): void {
	const base = document.createElement('base');
	base.setAttribute('href', href);
	document.head.append(base);
	baseTags.push(base);
}

export function removeBaseTags(): void {
	baseTags.splice(0).forEach((base) => base.remove());
}
