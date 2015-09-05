Accounts.ui.config({
 	requestPermissions: {
		google: 
		['profile',
		'email',
    'https://mail.google.com/',
		'https://www.googleapis.com/auth/calendar',
    'https://apps-apis.google.com/a/feeds/calendar/resource/']
 	}, 
 	forceApprovalPrompt: {google: true},
  requestOfflineToken: {google: true},
  passwordSignupFields: 'EMAIL_ONLY'
});

//Accounts.ui.config({passwordSignupFields: 'USERNAME_ONLY'});
