const LoginForm = require('../../models/LoginForm.js');
const displayErrorsUtils = require('../_form_utils/displayErrors.js');
const UserModel = require('../../models/UserModel.js');

function init(serviceLocator) {
    const loginForm = document.getElementById('login-form');

    displayErrorsUtils.initForm(loginForm);

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const serverErrorField = document.getElementById('login-form__server-errors');
        const model = new LoginForm(serviceLocator);
        model.login = loginForm.elements['login'].value;
        model.password = loginForm.elements['password'].value;

        const validationResult = model.validate();
        if (validationResult.ok !== true) {
            displayErrorsUtils.displayErrors(loginForm, validationResult.errors);
            return;
        }

        model.send()
            .then((res) => res.json())
            .then((json) => {
                console.log(json);
                if (json.successful) {
                    serviceLocator.user = UserModel.fromApiJson(json.message);
                    serviceLocator.user.saveInLocalStorage();
                    serviceLocator.router.changePage('');
                    serviceLocator.eventBus.emitEvent("auth", serviceLocator.user);
                    return;
                }
                displayErrorsUtils.displayServerError(serverErrorField, json.message);
            })
            .catch((res) => console.error(res));
    });
}

module.exports = init;
