import { ruleTester } from './rule-tester.mjs';

const message = 'Disabling signoz/no-text-css needs a reason after `--`.';

await ruleTester({
	rule: 'require-disable-reason',
	valid: [
		{
			name: 'reason after --',
			code:
				'// oxlint-disable-next-line signoz/no-text-css -- canvas label\nexport const a = 1;',
		},
		{
			name: 'block comment with a reason',
			code:
				'/* eslint-disable signoz/no-text-css -- email HTML */\nexport const a = 1;',
		},
		{
			name: 'another rule without a reason',
			code: '// oxlint-disable-next-line no-console\nexport const a = 1;',
		},
		{
			name: 'disable of every rule',
			code: '// eslint-disable-next-line\nexport const a = 1;',
		},
		{
			name: 'plain comment naming the rule',
			code: '// signoz/no-text-css flags font CSS\nexport const a = 1;',
		},
	],
	invalid: [
		{
			name: 'next-line without a reason',
			code: '// oxlint-disable-next-line signoz/no-text-css\nexport const a = 1;',
			errors: [{ message, line: 1, column: 1 }],
		},
		{
			name: 'empty reason',
			code: '// eslint-disable-line signoz/no-text-css --\nexport const a = 1;',
			errors: [{ message }],
		},
		{
			name: 'among other rules',
			code:
				'/* oxlint-disable no-console, signoz/no-text-css */\nexport const a = 1;',
			errors: [{ message }],
		},
	],
});
