Handlebars.registerHelper('combineIntoString', function(token, array) {
	//Get all the names from the array
	var names;
	switch (token) {
		case '@': 
			names = Groups.find({ _id: { $in: array } }).map(function(item){ return item.groupName; });
			break;
		case '!':
		    names = Tasks.find({ _id: { $in: array } }).map(function(item){ return item.taskName; });
			break;
		case '#':
		    names = Meteor.users.find({ _id: { $in: array } }).map(function(item){ return item.username; });
		    break;
	}
	if (names !== undefined) return token+names.join(" "+token);
	else return token;
});

//Only staff can view this stuff
Handlebars.registerHelper('staffView', function() {
	return Meteor.user() && ( Meteor.user().type==="staff" || Meteor.user().type==="admin" );
});

Handlebars.registerHelper('isStaff', function(userId) {
  return isStaff(userId);
});

//Check if user is logged in
Handlebars.registerHelper('signedIn', function() {
	return Meteor.user();
});

//Returns the UTC time converted to local format
Handlebars.registerHelper('localTime', function(time) {
  var localTime = moment.utc(time, "YYYY-MM-DD HH:mm:ss").toDate();
  return moment(localTime).format("YYYY-MM-DD HH:mm");
});

//Get the user's task status
Handlebars.registerHelper('getUserTaskButtons', function(userTaskStatus, taskId) {
  if (!userTaskStatus) return "<span class='glyphicon glyphicon-unchecked' title='incomplete'></span>";
  
  var status;
  var timeStamp;
  
  for (var i=0; i<userTaskStatus.length; i++) {
    if (userTaskStatus[i].taskId === taskId) {
      status = userTaskStatus[i].status;
      timeStamp = userTaskStatus[i].timeStamp;
      break;
    }
  }

  switch (status) {
    case "incomplete":
      return "<span class='glyphicon glyphicon-unchecked' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
    case "completed":
      return "<span class='glyphicon glyphicon-check' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
    case "late":
      return "<span class='glyphicon glyphicon-time' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
    case "excused":
      return "<span class='glyphicon glyphicon-edit' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
    case "madeup":
      return "<span class='glyphicon glyphicon-retweet' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
    default:
      if (status && status.indexOf("team completed") >= 0)
        return "<span class='glyphicon glyphicon-thumbs-up' data-toggle='popover' title='"+status + " " + jsUTCtoLocalTime(timeStamp)+"'></span>";
      return "<span class='glyphicon glyphicon-unchecked' data-toggle='popover' title='incomplete'></span>";
  }

});



