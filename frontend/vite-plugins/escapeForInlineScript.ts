export function escapeForInlineScript(value: string): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
