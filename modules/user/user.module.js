class UserModule {

    loginUser(username, password) {
        return {username: username,
        password: password}
    }

}

module.exports = UserModule;
