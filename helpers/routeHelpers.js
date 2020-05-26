module.exports = {
    schemas: {
        authSchema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string' },
                    password: { type: 'string' }
                },
                required: ['email', 'password']
            }
        }
    }
};
