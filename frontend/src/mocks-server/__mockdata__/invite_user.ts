export const inviteUser = {
	status: 'success',
	data: {
		statusCode: 200,
		error: null,
		payload: [
			{
				email: 'jane@doe.com',
				name: 'Jane',
				token: 'testtoken',
				createdAt: 1715741587,
				role: 'VIEWER',
				organization: 'test',
			},
			{
				email: 'test+in@singoz.io',
				name: '',
				token: 'testtoken1',
				createdAt: 1720095913,
				role: 'VIEWER',
				organization: 'test',
			},
		],
	},
};
