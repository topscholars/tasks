var overlappingMeeting = function (userId, start, end) {
  var startTime = moment.utc(start, "YYYY-MM-DD HH:mm:ss");
  var endTime = moment.utc(end, "YYYY-MM-DD HH:mm:ss");
  //console.log("startTime: ", startTime);
  //console.log("endTime: ", endTime);
  var conflicts = Meetings.find({attendee: userId}).map(function (thisMeeting) {
    var meetingStart = moment.utc(thisMeeting.start, "YYYY-MM-DD HH:mm").subtract(7, "hours");
    var meetingEnd = moment.utc(thisMeeting.end, "YYYY-MM-DD HH:mm").subtract(7, "hours");
    //console.log(startTime.unix(), meetingEnd.unix(), endTime.unix(), meetingStart.unix());
    if (startTime < meetingEnd && endTime > meetingStart)
      return true;    
    return false;
  });
  //console.log("conflicts: ", conflicts);
  if (conflicts.indexOf(true) > -1) return true;
  return false;
};

var freeOnGoogle = function(userId, start, end) {//expects time input to be UTC
  //return; //disable this for now because bulk uploads are always conflicting
  var user = Meteor.users.findOne(userId);
  if (user && user.services && user.services.google && 
        user.services.google.accessToken) {
    var startTimeUTC = moment.utc(start, "YYYY-MM-DD HH:mm:ss").format();
    var endTimeUTC = moment.utc(end, "YYYY-MM-DD HH:mm:ss").format();

    var url = "https://www.googleapis.com/calendar/v3/freeBusy";
    var options = {
      'headers' : {
        'Content-Type':  'application/json',
        'Authorization': "Bearer " + user.services.google.accessToken,
        'X-JavaScript-User-Agent': "Google APIs Explorer"
      },
      'data': {
         "timeMin": startTimeUTC,
         "timeMax": endTimeUTC,
         "items": [
          {
           "id": user.services.google.email
          }
         ]
      }
    };

    //console.log("options: "+JSON.stringify(options));

    var freeBusyResult = HTTP.post(url, options);

    //console.log("freeBusyResult: "+JSON.stringify(freeBusyResult));

    if (freeBusyResult.data && freeBusyResult.data.calendars[user.services.google.email].busy[0])
      return false;
  }//end if user
  return true;
};

var updateGoogleToken = function(userId) {//expects time input to be UTC
  var user = Meteor.users.findOne({_id: userId});

  var config = ServiceConfiguration.configurations.findOne({service: "google"});
  if (! config)
    throw new Meteor.Error(500, "Google service not configured for " + user.username + ". S/he needs to log in to grant permissions.");

  if (! user.services || ! user.services.google || ! user.services.google.refreshToken)
    throw new Meteor.Error(500, "Refresh token not found for " + user.username + ". S/he needs to log in to grant permissions.");
  
  try {
    var result = HTTP.post(
      "https://www.googleapis.com/oauth2/v3/token",
      {
        params: {
          'client_id': config.clientId,
          'client_secret': config.secret,
          'refresh_token': user.services.google.refreshToken,
          'grant_type': 'refresh_token'
        }
    });
  } catch (e) {
    var code = e.response ? e.response.statusCode : 500;
    throw new Meteor.Error(code, "Unable to exchange google refresh token for " + user.username + ". S/he needs to log in to grant permissions.", e.response);
  }
  
  if (result.statusCode === 200) {
    // console.log('success');
    // console.log(EJSON.stringify(result.data));

    Meteor.users.update(user._id, { 
      '$set': { 
        'services.google.accessToken': result.data.access_token,
        'services.google.expiresAt': (+new Date) + (1000 * result.data.expires_in),
      }
    });
  } else throw new Meteor.Error(result.statusCode, "Unable to exchange google refresh token for " + user.username + ". S/he needs to log in to grant permissions.", result);
};

Meteor.methods({
  eventsAPI: function(userId) {
    var user = Meteor.users.findOne(userId);
    updateGoogleToken(user._id);
    
    //get event details from Google Calendar 
    var numResults = 100;
    var timeString = moment().subtract(5, 'seconds').utc().toISOString();
    var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=updated&showDeleted=true&maxResults="+numResults+"&updatedMin="+timeString;
    var options = {
      'headers' : {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + user.services.google.accessToken,
        'X-JavaScript-User-Agent': "Google APIs Explorer"
      }
    };

    var eventGetResult = HTTP.get(url, options);
    var items = eventGetResult.data.items;

    for (var i = 0; i < items.length; i++) {
      var e = items[i];

      //console.log("e["+i+"]: " + JSON.stringify(e));

      if (!e.summary) continue;

      var gEvent = GoogleEvents.findOne({userId: user._id, eventId: e.id});

      if (e.status==="cancelled") {
        //console.log("CANCEL");
        if (!gEvent) continue;
        var taskToRemove = Tasks.findOne(gEvent.taskId);

        if (taskToRemove && taskToRemove.type==="meeting") {
          var meeting = Meetings.findOne({meetingTaskId: taskToRemove._id});
          Meteor.call('userTaskStatus', meeting.attendee, meeting.task, 'incomplete', function (error, result) {
            Meetings.remove(meeting._id);
          });
        }

        if (!isStaff(userId)) return;

        GoogleEvents.remove(gEvent._id);        

        if (!taskToRemove || !taskToRemove.googleCalendar) continue;
        Meteor.call('removeAllFromTasks', taskToRemove._id, function (error, result) {
          if (!error) Tasks.remove(taskToRemove._id);
        });
        //console.log("TASK REMOVED");
        continue;
      }

      if (!isStaff(userId)) return;

      var attendees = (e.attendees) ? Meteor.users.find({email: {$in: e.attendees.map(function(thisAttendee){ return thisAttendee.email; }) } }).map(function(thisUser){ return thisUser._id; }) : [];

      var taskProperties = {
        taskMaster: user._id,
        taskName: e.summary,
        transparency: e.transparency,
        description: e.description,
        location: e.location,
        startTime: moment(e.start.dateTime).utc().format("YYYY-MM-DD HH:mm:ss"),
        endTime: moment(e.end.dateTime).utc().format("YYYY-MM-DD HH:mm:ss"),
        users: attendees,
        groups: [],
        status: "active",
        sms: "Don't forget "+e.summary+" at Top Scholars on "+moment(e.start.dateTime).add(7, "hours").utc().format('dddd [at] h:mm a')+". See you then!",
        smsTime: moment(e.start.dateTime).subtract(24, "hours").utc().format("YYYY-MM-DD HH:mm:ss"),
        emailBody: e.description,
        emailTime: "",
        visible: true,
        emailSMS: true,
        googleCalendar: true,
        userId: user._id,
        author: user.username,
        submitted: new Date().getTime()
      };

      //check event name
      switch (e.summary.split(" ")[0].toUpperCase()) {
        case 'PARENT':
        case 'COUNSELING':
        case 'RWC':
        case 'TUTORIAL':
        case 'WRITING':
          taskProperties.type = "meeting";
          break;
        case 'TEST':
          taskProperties.type = "test";
          break;
        case 'CLASS':
          taskProperties.type = "class";
          break;
        case 'WORKSHOP':
        case 'UNI':
          taskProperties.type = "event";
          break;
        case 'SMS:':
          taskProperties.type = "SMS";
          taskProperties.taskName = e.summary;//e.summary.replace(/sms: /i,"");
          taskProperties.sms = e.summary.replace(/sms: /i,"").substring(0,159);
          taskProperties.smsTime = moment(e.start.dateTime).utc().format("YYYY-MM-DD HH:mm:ss");
          taskProperties.emailBody = "";
          taskProperties.emailTime = "";
          break;
        case 'EMAIL:':
          taskProperties.type = "email";
          taskProperties.taskName = e.summary;//e.summary.replace(/email: /i,"");
          taskProperties.sms = "";
          taskProperties.smsTime = "";
          taskProperties.emailBody = e.description;
          taskProperties.emailTime = moment(e.start.dateTime).utc().format("YYYY-MM-DD HH:mm:ss");
          break;
        default:
          continue;
      }

      //console.log("TASK: " + JSON.stringify(taskProperties));
      
      if (gEvent) {
        //update task
        //console.log("UPDATE");
        var task = Tasks.findOne(gEvent.taskId);          
        if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
          console.log("Since this is not production, users will not be modified.");
          delete taskProperties.users;
        }
        Tasks.update(task._id, {$set: taskProperties}, function (error, result) {
          if (!error) Meteor.call('removeAllFromTasks', task._id, function (error, result) {
            if (!error) Meteor.call('addToTasks', task._id);
          });
        });
      } else if (Tasks.findOne({taskName: e.summary, 
                                users: userId, 
                                startTime: moment(e.start.dateTime).utc().format("YYYY-MM-DD HH:mm:ss"),
                                endTime: moment(e.end.dateTime).utc().format("YYYY-MM-DD HH:mm:ss")
                              }) && (taskProperties.type==="meeting" || taskProperties.type==="event")) {
        console.log("DUPLICATE TASK - IGNORE");
        continue;
      } else {
        //create new task
        console.log("NEW");
        if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
          console.log("Since this is not production, users will be only Task Master.");
          taskProperties.users = [user._id];
        }
        Tasks.insert(taskProperties, function (error, id) {
          if (!error) {
            Meteor.call('addToTasks', id);
            gEvent = {
              taskId: id,
              userId: user._id,
              eventId: e.id
            }
            GoogleEvents.insert(gEvent);
          }
        });//Tasks.insert(taskProperties, function (error, id) {
      }          
    }//for (var i = 0; i < numResults; i++) {

  },

  createFollowUpTasks: function(taskId) {
    var thisTask = Tasks.findOne(taskId);

    var existingFollowupTask = Tasks.findOne({type: "appointment", prereqs: taskId});
    if (existingFollowupTask) {
      var meeting = Meetings.findOne({task: existingFollowupTask._id});
      if (meeting) Meteor.call('cancelAppointment', meeting._id);
      else 
        Meteor.call('removeAllFromTasks', existingFollowupTask._id, function (error, result) {
          if (!error) Tasks.remove(existingFollowupTask._id);
        });
    }

    var followUpTask = {
      taskMaster: thisTask.taskMaster,
      taskName: "Schedule " + thisTask.followUpName,
      transparency: "transparent",
      description: thisTask.description,
      location: thisTask.location,
      type: "appointment",
      status: "active",
      startTime: thisTask.endTime,
      endTime: moment.utc(thisTask.endTime, 'YYYY-MM-DD HH:mm:ss').add(thisTask.dueDuration, "weeks").format('YYYY-MM-DD HH:mm:ss'),
      groups: [],
      users: [],
      prereqs: [taskId],
      slotDuration: thisTask.slotDuration,
      dueDuration: thisTask.dueDuration,
      emailBody: "",
      emailTime: "",
      sms: "If you haven't scheduled a follow-up for " + thisTask.followUpName + ", please do so ASAP",
      smsTime: moment.utc(thisTask.endTime, 'YYYY-MM-DD HH:mm:ss').add(thisTask.dueDuration, "weeks").subtract(3, "days").format('YYYY-MM-DD HH:mm:ss'),
      visible: true,
      emailSMS: true,
      googleCalendar: false,
      userId: thisTask.userId,
      author: thisTask.author,
      submitted: thisTask.submitted
    };


    if (thisTask.users) {
      var allTaskUsers = Meteor.users.find({_id: {$in: thisTask.users}});
      allTaskUsers.forEach(function(thisUser) {

        var existingApptTask = Tasks.findOne({users: thisUser._id, type: "appointment", prereqs: taskId});

        if (existingApptTask) {
          Meteor.users.update(
            {_id: thisUser._id},
            {
              $pull: {tasks: existingApptTask._id}
            }
          );
          Tasks.remove(existingApptTask._id);
        }

        followUpTask.users = [thisUser._id];

        var followUpTaskId = Tasks.insert(followUpTask);

        Meteor.users.update({
          //only update those with matching id without already having the task
          _id: thisUser._id,
          tasks: {$ne: followUpTaskId}
        }, {
          $addToSet: {tasks: followUpTaskId}
        });

        if (Meteor.isServer)//SyncedCron runs on server only 
          if(thisTask.emailSMS||isStaff(thisUser._id))
            scheduleIt(thisUser, followUpTaskId);
      });//end forEach
    }

    if (thisTask.groups) {
      var allTaskGroups = Groups.find({_id: {$in: thisTask.groups}});
      allTaskGroups.forEach(function(thisGroup) {

        if (thisGroup.users) {
          var allGroupUsers = Meteor.users.find({_id: {$in: thisGroup.users}});
          allGroupUsers.forEach(function(thisUser) {

            var existingApptTask = Tasks.findOne({users: thisUser._id, type: "appointment", prereqs: taskId});

            if (existingApptTask) {
              Meteor.users.update(
                {_id: thisUser._id},
                {
                  $pull: {tasks: existingApptTask._id}
                }
              );
              Tasks.remove(existingApptTask._id);
            }
            
            followUpTask.users = [thisUser._id];

            var followUpTaskId = Tasks.insert(followUpTask);

            Meteor.users.update({
              //only update those with matching id without already having the task
              _id: thisUser._id,
              tasks: {$ne: followUpTaskId}
            }, {
              $addToSet: {tasks: followUpTaskId}
            });

            if (Meteor.isServer)//SyncedCron runs on server only 
              if(thisTask.emailSMS||isStaff(thisUser._id))
                scheduleIt(thisUser, followUpTaskId);
          });//end forEach
        }

      });//end forEach      
    }
  },

  getAvailableSlots: function(taskId, date, stagger) {

    var task = Tasks.findOne(taskId);
    var taskMaster = Meteor.users.findOne(task.taskMaster);
    var slots = [];

    updateGoogleToken(taskMaster._id);
    
    var calId = taskMaster.availabilityCalendarId;

    //get event details from Google Calendar 
    var numResults = 100;
    var timeMin = date.substr(0,11) + '00:00:00+07:00';
    var timeMax = date.substr(0,11) + '23:59:59+07:00';
    //console.log("timeMin: "+timeMin);
    //console.log("timeMax: "+timeMax);
    timeMin = encodeURIComponent(timeMin);
    timeMax = encodeURIComponent(timeMax);
    var params = "maxResults="+numResults+"&timeMin="+timeMin+"&timeMax="+timeMax+"&singleEvents=true&orderBy=startTime&showDeleted=false&q=%22Available%22";
    var url = "https://www.googleapis.com/calendar/v3/calendars/"+calId+"/events";
    url = url + "?" + params;
    var options = {
      'headers' : {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + taskMaster.services.google.accessToken,
        'X-JavaScript-User-Agent': "Google APIs Explorer"
      }
    };

    var eventGetResult = HTTP.get(url, options);
    //console.log(JSON.stringify(eventGetResult));
    var items = eventGetResult.data.items;

    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      //console.log("e["+i+"]: " + JSON.stringify(e));
      if (!e.summary || e.summary !== "Available") continue;

      var slotStartTime = moment(e.start.dateTime).add(7, "hours");

      if (stagger) slotStartTime.add(30, "minutes");

      var thisSlot = {start: slotStartTime.utc().format('YYYY-MM-DD HH:mm')};
      var blockEndTime = moment(e.end.dateTime).add(7, "hours"); 
      while (task.slotDuration && slotStartTime.add(task.slotDuration, "minutes") <= blockEndTime) {
        //console.log("slotStartTime: " + JSON.stringify(slotStartTime));
        thisSlot.end = slotStartTime.utc().format('YYYY-MM-DD HH:mm');

        searchStart = moment.utc(thisSlot.start, "YYYY-MM-DD HH:mm").subtract(7, "hours").format("YYYY-MM-DD HH:mm:ss");
        searchEnd = moment.utc(thisSlot.end, "YYYY-MM-DD HH:mm").subtract(7, "hours").format("YYYY-MM-DD HH:mm:ss");

        //console.log('searchStart', searchStart, 'searchEnd', searchEnd);

        if (freeOnGoogle(taskMaster._id, searchStart, searchEnd)) {//Don't add slot if primary calendar is busy during that time
          //console.log("thisSlot", thisSlot);
          slots.push({start: thisSlot.start, end: thisSlot.end});              
        }
        //console.log("slots: " + JSON.stringify(slots));
        thisSlot.start = thisSlot.end;
      }
      
    }//for (var i = 0; i < items.length; i++) {

    return slots;
  },  

  makeAppointment: function(userId, taskId, start, end) {

    var task = Tasks.findOne(taskId);
    var taskMaster = Meteor.users.findOne(task.taskMaster);
    var thisUser = Meteor.users.findOne(userId);

    updateGoogleToken(thisUser._id);
    updateGoogleToken(taskMaster._id);
    
    searchStart = moment.utc(start, "YYYY-MM-DD HH:mm").subtract(7, "hours").format("YYYY-MM-DD HH:mm:ss");
    searchEnd = moment.utc(end, "YYYY-MM-DD HH:mm").subtract(7, "hours").format("YYYY-MM-DD HH:mm:ss");

    if (overlappingMeeting(thisUser._id, searchStart, searchEnd)
          || !freeOnGoogle(thisUser._id, searchStart, searchEnd)) {
      throw new Meteor.Error(598, "You appear to be busy during this time. Please try a different time");
    }

    if (!freeOnGoogle(taskMaster._id, searchStart, searchEnd)) {
      throw new Meteor.Error(598, taskMaster.username + " no longer available during this time.");
    }

    var startTimeUTC = moment.utc(start, "YYYY-MM-DD HH:mm").subtract(7, "hours").format();
    var endTimeUTC = moment.utc(end, "YYYY-MM-DD HH:mm").subtract(7, "hours").format();
    var transparency = "opaque";

    var taskProperties = {
      taskMaster: task.taskMaster,
      taskName: task.taskName.replace("Schedule ", ""),
      prereqs: [],
      type: "meeting",
      transparency: transparency,
      description: task.description,
      location: task.location,
      startTime: moment(startTimeUTC).utc().format("YYYY-MM-DD HH:mm:ss"),
      endTime: moment(endTimeUTC).utc().format("YYYY-MM-DD HH:mm:ss"),
      users: [userId],
      groups: [],
      status: "active",
      sms: "Don't forget " + task.taskName.replace("Schedule ", "") + " at Top Scholars on "+moment(startTimeUTC).add(7, "hours").utc().format('dddd [at] h:mm a')+". See you then!",
      smsTime: moment(startTimeUTC).subtract(24, "hours").utc().format("YYYY-MM-DD HH:mm:ss"),
      emailBody: "",
      emailTime: "",
      visible: true,
      emailSMS: true,
      googleCalendar: true,
      userId: taskMaster._id,
      author: task.taskMaster,
      submitted: new Date().getTime()
    };

    var meetingTaskId = Tasks.insert(taskProperties);
    Meteor.call('addToTasks', meetingTaskId);
    if (taskProperties.googleCalendar)
      Meteor.call('insertGoogleEvent', meetingTaskId, function (error, result) {
        if (error) throw new Meteor.Error(504, error.reason);
      });//end Meteor.call('insertGoogleEvent'

    var existingMeeting = Meetings.findOne({task:taskId});
    if (existingMeeting) 
      Meteor.call('cancelAppointment', existingMeeting._id);

    Meetings.insert({
      task: taskId,
      meetingTaskId: meetingTaskId,
      host: task.taskMaster,
      attendee: userId,
      start: startTimeUTC,
      end: endTimeUTC
    });

    Meteor.call('userTaskStatus', userId, taskId, 'completed');
    
  },  

  cancelAppointment: function(meetingId) {

    var meeting = Meetings.findOne(meetingId);
    if (this.userId !== meeting.attendee && this.userId !== meeting.host)
      throw new Meteor.Error(590, "User not involved in this meeting");

    if (moment(meeting.start).subtract(24, "hours") < moment())
      throw new Meteor.Error(590, "No cancellations online within 24 hours of meeting, please call the office 02-714-3033");

    Meteor.call('exchangeRefreshToken', meeting.host, function (error, result) {
      if (!error) {
        Meteor.call('removeAllFromTasks', meeting.meetingTaskId, function (error, id) {
          if (!error) {
            Meteor.call('deleteGoogleEvent', meeting.meetingTaskId, function (error, result) {
              Meetings.remove({_id: meetingId});
              Meteor.call('userTaskStatus', meeting.attendee, meeting.task, 'incomplete');
            });
            Tasks.remove(meeting.meetingTaskId);
          } else throw new Meteor.Error(599, error.reason);
        });//end Meteor.call('removeAllFromTasks'
      } else throw new Meteor.Error(500, error.reason);
    });//end Meteor.call('exchangeRefreshToken'   

  },  

  removeFromTasks: function(currentTaskId) {
    var currentTask = Tasks.findOne(currentTaskId);

    //find all the users that have this task
    var allTaskUsers = Meteor.users.find({tasks: currentTaskId});

    //if this task does not have the user, remove the task from the user
    allTaskUsers.forEach(function (thisUser) {
      if(currentTask.users.indexOf(thisUser._id) < 0) {//task does not have user
        Meteor.users.update(
          //only update those with matching id
          {_id: thisUser._id}, 
          { 
            $pull: {tasks: currentTaskId}
          }
        );
        unscheduleIt(thisUser, currentTask); 
      }   
    });//end forEach

    //find all the groups that have this task
    var allTaskGroups = Groups.find({tasks: currentTaskId});
    
    //if this task does not have the group, remove the task from the group
    allTaskGroups.forEach(function (thisGroup) {
      if(currentTask.groups.indexOf(thisGroup._id) < 0) {//task does not have group
        Groups.update(
          //only update those with matching taskname
          {_id: thisGroup._id },
          {
            $pull: {tasks: currentTaskId}
          }
        );
        recursiveTaskFromGroup(thisGroup, currentTask);
      }
    });//end forEach
  },

  addToGroups: function(groupId) {

    var thisGroup = Groups.findOne(groupId);

    if (thisGroup.tasks) {
      var allGroupTasks = Tasks.find({_id: {$in: thisGroup.tasks}});
      allGroupTasks.forEach(function(thisTask) {
        Tasks.update({
          //only update those with matching id without already having the group
          _id: thisTask._id,
          groups: {$ne: thisGroup._id}
        }, {
          $addToSet: {groups: thisGroup._id}
        });

        //schedule for every user in every subgroup
        recursiveTaskToGroup(thisGroup, thisTask);
      });//end forEach      
    }

    if (thisGroup.users) {
      var allGroupUsers = Meteor.users.find({_id: {$in: thisGroup.users}});
      allGroupUsers.forEach(function(thisUser) {
        Meteor.users.update({
          //only update those with matching id without already having the group
          _id: thisUser._id,
          groups: {$ne: thisGroup._id}
        }, {
          $addToSet: {groups: thisGroup._id}
        });

        //Assumes all tasks have been added to the group before continuing
        //schedule for user in this group and in every subgroup
        recursiveUserToGroup(thisGroup, thisUser);
      });//end forEach      
    }

  },
  
  removeFromGroups: function(currentGroupId) {
    var currentGroup = Groups.findOne(currentGroupId);

    //find all the users that have this group
    var allGroupUsers = Meteor.users.find({groups: currentGroupId});

    //if this group does not have the user, remove the group from the user
    allGroupUsers.forEach(function (thisUser) {
      if(currentGroup.users.indexOf(thisUser._id) < 0) {//group does not have user
        Meteor.users.update(
          //only update those with matching id
          {_id: thisUser._id}, 
          { 
            $pull: {groups: currentGroupId}
          }
        );

        //unsubscribe user from this group and from every subgroup
        //Requires that tasks have not yet been removed from group (see below)
        //If a task has been independently assigned to a user,
        //and that task is also associated with the group to be removed,
        //that task will be removed from the user.
        recursiveUserFromGroup(currentGroup, thisUser); 
      }   
    });//end forEach

    //find all the tasks that have this group
    var allGroupTasks = Tasks.find({groups: currentGroupId});
    
    //if this group does not have the task, remove the group from the task
    allGroupTasks.forEach(function (thisTask) {
      if(currentGroup.tasks.indexOf(thisTask._id) < 0) {//group does not have task
        Tasks.update(
          //only update those with matching id
          {_id: thisTask._id},
          {
            $pull: {groups: currentGroupId}
          }
        );

        //unschedule for every user in every subgroup
        recursiveTaskFromGroup(currentGroup, thisTask);

      }
    });//end forEach
  },
  
  removeAllFromGroups: function(currentGroupId) {
    var currentGroup = Groups.findOne(currentGroupId);

    //find all the users that have this group
    var allGroupUsers = Meteor.users.find({groups: currentGroupId});

    //remove the group from the user
    allGroupUsers.forEach(function (thisUser) {
      Meteor.users.update(
        //only update those with matching id
        {_id: thisUser._id}, 
        { 
          $pull: {groups: currentGroupId}
        }
      );

      //unsubscribe user from this group and from every subgroup
      //Requires that tasks have not yet been removed from group (see below)
      //If a task has been independently assigned to a user,
      //and that task is also associated with the group to be removed,
      //that task will be removed from the user.
      recursiveUserFromGroup(currentGroup, thisUser); 
 
    });//end forEach

    //find all the tasks that have this group
    var allGroupTasks = Tasks.find({groups: currentGroupId});
    
    //remove the group from the task
    allGroupTasks.forEach(function (thisTask) {
      Tasks.update(
        //only update those with matching id
        {_id: thisTask._id },
        {
          $pull: {groups: currentGroupId}
        }
      );

      //unschedule for every user in every subgroup
      recursiveTaskFromGroup(currentGroup, thisTask);

    });//end forEach
  },

  userAPI: function(userAttributes) {
    
    if (!emailIsValid(userAttributes.email))
      throw new Meteor.Error(401, "Please enter a valid email.");

    var existingEmail = Meteor.users.findOne({email: userAttributes.email});
    var existingUsername = Meteor.users.findOne({username: userAttributes.username});
    //if (!emailIsUnique([], userAttributes.email) || !userIsUnique([]), userAttributes.username);
    if (existingEmail) {
      Meteor.users.update(
          {email: userAttributes.email},
          {
            $set: userAttributes
          }
      );
      return existingEmail._id;
    }
    else if (existingUsername) {
      Meteor.users.update(
          {username: userAttributes.username},
          {
            $set: userAttributes
          }
      );
      return existingUsername._id;
    }
    else {
      // pick out the whitelisted keys
      var user = _.extend(_.pick(userAttributes, 'firstName', 'nickName', 'lastName', 'username', 'type', 'status', 'groups', 'tasks', 'rsvps', 'email', 'phone', 'birthdate', 'address1', 'address2', 'city', 'state', 'postalCode', 'country'), {
        emails: [{"address": userAttributes.email, "verified": false}],
        userId: "USER_API", 
        author: "USER_API", 
        submitted: new Date().getTime(),
      });
      
      var userId = Meteor.users.insert(user);     
      return userId; 
    }    
  },

  addToUsers: function(userId) {

    var thisUser = Meteor.users.findOne(userId);

    if (thisUser.users) {
      var allUserUsers = Meteor.users.find({_id: {$in: thisUser.users}});
      allUserUsers.forEach(function (thisUser) {
        Meteor.users.update({
          //only update those with matching id without already having the user
          _id: thisUser._id,
          users: {$ne: thisUser._id}
        }, {
          $addToSet: {users: thisUser._id}
        });
      });//end forEach      
    }

    if (thisUser.tasks) {
      var allUserTasks = Tasks.find({_id: {$in: thisUser.tasks}});
      allUserTasks.forEach(function (thisTask) {
        Tasks.update({
          //only update those with matching id without already having the user
          _id: thisTask._id,
          users: {$ne: thisUser._id}
        }, {
          $addToSet: {users: thisUser._id}
        });

        scheduleIt(thisUser, thisTask);
      });//end forEach      
    }

    if (thisUser.groups) {
      var allUserGroups = Groups.find({_id: {$in: thisUser.groups}});
      allUserGroups.forEach(function (thisGroup) {
        Groups.update({
          //only update those with matching id without already having the user
          _id: thisGroup._id,
          users: {$ne: thisUser._id}
        }, {
          $addToSet: {users: thisUser._id}
        });

        //subscribe user to this group and to every subgroup
        //If a task has been independently assigned to a user,
        //and that task is also associated with the group to be added,
        //that task will not be duplicated to the user.
        recursiveUserToGroup(thisGroup, thisUser); 

      }); //end forEach      
    }

  },

  //SHOULD REALLY PICK OUT THE WHITELISTED KEYS FIRST HERE AND IN VARIOUS OTHER SERVER METHODS
  //Assumes user.email already has the new email to be updated in user.emails[0].address
  updateEmail: function(userId) {
    var user = Meteor.users.findOne(userId);
    //Validate email formatting
    if (!emailIsValid(user.email))
      throw new Meteor.Error(403, "Invalid email. Try again.");
    else if (!emailIsUnique(user, user.email))
      throw new Meteor.Error(401, "Email cannot already be in use.");
    else {
      Meteor.users.update({_id:user._id}, {$set:{"emails":[{address:user.email, "verified": false}]}});
      Accounts.sendVerificationEmail(user._id);
    }
  },

  removeFromUsers: function(currentUserId) {
    var currentUser = Meteor.users.findOne(currentUserId);

    //find all the tasks that have this user
    var allUserTasks = Tasks.find({users: currentUserId});

    //if this user does not have the task, remove the user from the task
    allUserTasks.forEach(function (thisTask) {
      if(currentUser.tasks.indexOf(thisTask._id) < 0) {//user does not have task
        Tasks.update(
          //only update those with matching id
          {_id: thisTask._id}, 
          { 
            $pull: {users: currentUserId}
          }
        );

        unscheduleIt(currentUser, thisTask); 
      }   
    });//end forEach


    //find all the groups that have this user
    var allUserGroups = Groups.find({users: currentUserId});
    
    //if this user does not have the group, remove the user from the group
    allUserGroups.forEach(function (thisGroup) {
      if(currentUser.groups.indexOf(thisGroup._id) < 0) {//user does not have group
        Groups.update(
          //only update those with matching id
          {_id: thisGroup._id },
          {
            $pull: {users: currentUserId}
          }
        );
        recursiveUserFromGroup(thisGroup, currentUser);
      }
    });//end forEach
  },
  
  removeAllFromUsers: function(currentUserId) {
    var currentUser = Meteor.users.findOne(currentUserId);

    //find all the tasks that have this user
    var allUserTasks = Tasks.find({users: currentUserId});

    allUserTasks.forEach(function (thisTask) {
      Tasks.update(
        //only update those with matching id
        {_id: thisTask._id}, 
        { 
          $pull: {users: currentUserId}
        }
      );

      unscheduleIt(currentUser, thisTask); 
    });//end forEach

    //find all the groups that have this user
    var allUserGroups = Groups.find({users: currentUserId});
 
    allUserGroups.forEach(function (thisGroup) {
      Groups.update(
        //only update those with matching id
        {_id: thisGroup._id},
        {
          $pull: {users: currentUserId}
        }
      );
      recursiveUserFromGroup(thisGroup, currentUser);
    });//end forEach
  },

  userTaskStatus: function(userId, taskId, status) {

    var user = Meteor.users.findOne(userId);

    // ensure the user exists
    if (!user)
      throw new Meteor.Error(401, "User cannot be found");

    var task = Tasks.findOne(taskId);
    
    // ensure the user is staff
    if (!isStaff(this.userId)&&task.type&&task.type.toLowerCase()!=="appointment")
      throw new Meteor.Error(402, "You need to be staff to edit tasks");
    
    var prevStatus;
    if (user.userTaskStatus) {
      for (var i=0; i<user.userTaskStatus.length; i++) {
        if (user.userTaskStatus[i].taskId === taskId) {
          prevStatus = user.userTaskStatus[i].status;
          break;
        }
      }      
    }

    if (status==="team completed" || status==="incomplete"&&prevStatus&&prevStatus.indexOf("team completed") >= 0) {
      var teamStatus = "incomplete";
      if (status === "team completed")
        teamStatus = "team completed by " + user.username;
      var allTaskUsers = Meteor.users.find({tasks: taskId});
      allTaskUsers.forEach(function (thisUser) {
        Tasks.update({
          _id: taskId
        }, {
          $pull: {userTaskStatus: {userId: thisUser._id} }
        });

        Meteor.users.update({
          _id: thisUser._id
        }, {
          $pull: {userTaskStatus: {taskId: taskId} }
        });

        Tasks.update({
          _id: taskId,
          userTaskStatus: {$ne: {userId: thisUser._id}}
        }, {
          $addToSet: {userTaskStatus: {userId: thisUser._id, status: teamStatus, timeStamp: new Date().getTime()}}
        });

        Meteor.users.update({
          _id: thisUser._id,
          userTaskStatus: {$ne: {taskId: taskId}}
        }, {
          $addToSet: {userTaskStatus: {taskId: taskId, status: teamStatus, timeStamp: new Date().getTime()}}
        });
      });
      return;
    }

    Tasks.update({
      _id: taskId
    }, {
      $pull: {userTaskStatus: {userId: userId} }
    });

    Meteor.users.update({
      _id: userId
    }, {
      $pull: {userTaskStatus: {taskId: taskId} }
    });

    Tasks.update({
      _id: taskId,
      userTaskStatus: {$ne: {userId: userId}}
    }, {
      $addToSet: {userTaskStatus: {userId: userId, status: status, timeStamp: new Date().getTime()}}
    });

    Meteor.users.update({
      _id: userId,
      userTaskStatus: {$ne: {taskId: taskId}}
    }, {
      $addToSet: {userTaskStatus: {taskId: taskId, status: status, timeStamp: new Date().getTime()}}
    });

  }
});
