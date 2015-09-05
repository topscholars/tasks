
Accounts.emailTemplates.siteName = "TS alpha | Task Scheduler";

Accounts.emailTemplates.from = "TS alpha <admin@topscholars.org>";

Accounts.emailTemplates.verifyEmail.subject = function (user) {
    return "Confirm your TS alpha registration";
};

Accounts.emailTemplates.verifyEmail.text = function (user, url) {
   return "To activate your account, simply click the link below:\n\n"
     + url;
};

Accounts.validateNewUser(function (user) {
    var email;
    if(user.services.google)
	   email = user.services.google.email; //Google email overrides all others
    if (!email) {
        if (user.emails) {
            email = user.emails[0].address;
        }
    }
	return emailIsValid(email);
});

