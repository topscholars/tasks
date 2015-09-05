Template.userTypeSelector.helpers({ 
  
selectedType: function(userType) {
	if (!Session.get('currentUserId')) return false;
	return userType === Meteor.users.findOne(Session.get('currentUserId')).type;
}

});
