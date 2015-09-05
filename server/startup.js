Meteor.startup(function(){
	process.env.MAIL_URL='smtp://theartster@gmail.com:7aC_YpbbZJPov2MdFaVFLQ@smtp.mandrillapp.com:587';
	process.env.DISABLE_WEBSOCKETS=1;

	SyncedCron.start();

	Schedules.remove({});

	//Calls.remove({});
	//Gmails.remove({});

	var s = 100;
	var allGoogleChannels = GoogleChannels.find({});
	allGoogleChannels.forEach(function(thisChannel) {
		console.log(JSON.stringify(thisChannel));
		Meteor.call('exchangeRefreshToken', thisChannel.userId, function (error, result) {
			if (!error) {
				Meteor.call('setGoogleChannelRefresh', thisChannel.userId, moment().add(s, "s").format());
			} else throw new Meteor.Error(504, error.reason); 
		});
		s = s + 5;
	});

	var allStaff = Meteor.users.find({$or: [{type: "staff"}, {type: "admin"}]});
	allStaff.forEach(function (thisStaff) {
		if (!thisStaff.availabilityCalendarId && thisStaff.services && thisStaff.services.google && 
          thisStaff.services.google.accessToken) {
			Meteor.call('exchangeRefreshToken', thisStaff._id, function (error, result) {
				if (!error) {
					Meteor.call('createAvailabilityCalendar', thisStaff._id);
				} else throw new Meteor.Error(504, error.reason); 
			});			
		}
	});
	
	//Re-arrange all user completedBy field to completedUsers field
	//Re-schedule all user's tasks when server restarts
	var allUsers = Meteor.users.find({});
	allUsers.forEach(function (thisUser) {
		if (thisUser.tasks) {
		    var allUserTasks = Tasks.find({_id: {$in: thisUser.tasks}});
		    allUserTasks.forEach(function (thisTask) {
		    	//transferTaskStatus(thisUser, thisTask);
		    	if (thisTask.emailSMS)
		    		scheduleIt(thisUser, thisTask);
		    });
		    //updateUserName(thisUser);
		} else Meteor.users.update({_id: thisUser._id}, {$set: {tasks: []}});
		if (!thisUser.groups) Meteor.users.update({_id: thisUser._id}, {$set: {groups: []}});
	});

	// var allTasks = Tasks.find({});
	// allTasks.forEach(function(thisTask) {
	// 	setVisibleTrue(thisTask._id);
	// 	//if (thisTask.status === "pending")
	// 	//	updateTaskStatus(thisTask._id);
	// });

	var allTasks = Tasks.find({});
	allTasks.forEach(function(thisTask) {
		if(thisTask.type)
			Tasks.update(thisTask._id, {$set: {type: thisTask.type.toLowerCase()}});
	});
});

// var setVisibleTrue = function (taskId) {
//   Tasks.update(
//       {_id: taskId},
//       {
//         $set: { visible: true }
//       }
//   );
// }

// var transferTaskStatus = function (user, task) {
// 	if (task.completedBy && task.completedBy.indexOf(user._id) > -1) Meteor.call('checkOff', user._id, task._id);
// };

// var updateUserName = function (user) {
//   username = user.firstName + " " + user.lastName;
//   if (user.nickName) username = user.firstName + " " + user.nickName + " " + user.lastName;
//   Meteor.users.update(
//       {_id: user._id},
//       {
//         $set: { username: username }
//       }
//   );
// }

// var updateTaskStatus = function (taskId) {
//   Tasks.update(
//       {_id: taskId},
//       {
//         $set: { status: "active" }
//       }
//   );
// }