EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// check that the userId specified owns the documents
isUser = function(userId, doc) {
	return doc && doc._id === userId;
};

isAdmin = function(userId) {
	return Meteor.users.findOne(userId).type === "admin";
};

//Admin are also staff
isStaff = function(userId) {
	return userId && (Meteor.users.findOne(userId).type === "staff" || isAdmin(userId));
};

userIsUnique = function(doc, newUsername) {
    //make sure the name field is not blank
    //find a user other than this one that has the same name
    var userWithSameName;
    if (doc) userWithSameName = Meteor.users.findOne({_id: {$ne: doc._id}, username: newUsername});
    else userWithSameName = Meteor.users.findOne({username: newUsername});
    return newUsername && !userWithSameName;
};

emailIsUnique = function(doc, newUserEmail) {
    //make sure the email field is not blank
    //find a user other than this one that has the same email
    var userWithSameEmail = Meteor.users.findOne({_id: {$ne: doc._id}, email: newUserEmail});
    return newUserEmail && !userWithSameEmail;
};

phoneIsUnique = function(doc, newUserPhone) {
    //make sure the phone field is not blank
    //find a user other than this one that has the same phone
    var userWithSamePhone = Meteor.users.findOne({_id: {$ne: doc._id}, phone: newUserPhone});
    return newUserPhone && !userWithSamePhone;
};

emailIsValid = function(email) {
	//Validate email formatting
	return EMAIL_REGEX.test(email);
};
