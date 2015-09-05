Template.userStatusSelector.helpers({ 
  
selectedStatus: function(userStatus) {
	//If it is the new user page, always use the first status as default
	if (window.location.pathname.indexOf('new') !== -1)
		return false;
	if (!Session.get('currentUserId')) return false;
	return userStatus === Meteor.users.findOne(Session.get('currentUserId')).status;
}

});
