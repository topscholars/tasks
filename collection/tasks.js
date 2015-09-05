Tasks = new Mongo.Collection('tasks');
Schedules = new Mongo.Collection('schedules');
GoogleEvents = new Mongo.Collection('googleEvents');

Tasks.allow({
  insert: isStaff,
  update: isStaff,
  remove: isStaff
});

Tasks.deny({
  remove: function(userId, doc) {
    var user = Meteor.users.findOne(userId);
    
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(401, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    if (doc.type && doc.type.toUpperCase() === "RSVP")
      throw new Meteor.Error(401, "This is an RSVP task. It can only be modified via it's RSVP.");
  },

  update: function(userId, doc, fieldNames, modifier) {


    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    if (modifier.$set.type&&modifier.$set.type.toUpperCase()!=="RSVP_OPEN"&&modifier.$set.type.toUpperCase()!=="RSVP") {
      // ensure the user is staff
      if (!isStaff(user._id))
        throw new Meteor.Error(401, "You need to be staff");
    }
    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    // ensure the task has a name
    if (!modifier.$set.taskName)
      throw new Meteor.Error(422, 'Please fill in a Task name');

    // ensure the task has a taskMaster
    if (!modifier.$set.taskMaster)
      throw new Meteor.Error(422, 'Please fill in a valid Task master');

    // ensure the task has a type
    if (!modifier.$set.type)
      throw new Meteor.Error(422, 'Please fill in a valid type');

    // ensure the task has a status
    if (!modifier.$set.status)
      throw new Meteor.Error(422, 'Please fill in a valid status');

    // ensure end is after start
    if (moment(modifier.$set.startTime, "YYYY-MM-DD HH:mm:ss") > moment(modifier.$set.endTime, "YYYY-MM-DD HH:mm:ss"))
      throw new Meteor.Error(422, 'Please start cannot be after end');

    // if (Meteor.isServer) {
    //   if (!Meteor.users.findOne(modifier.$set.taskMaster)) throw new Meteor.Error(422, "Please specify a valid task master."); 

    //   var groupIds = modifier.$set.groups;
    //   if (groupIds){
    //     for(var i = 0; i < groupIds.length; i++){
    //       //ensure that the task exists
    //       var thisGroup = Groups.findOne(groupIds[i]);
    //       if (!thisGroup)
    //         throw new Meteor.Error(401, "Could not find group with id \""+groupIds[i]+"\".");
    //     }
    //   }

    //   var userIds = modifier.$set.users;
    //   if(userIds) {
    //     for(var i = 0; i < userIds.length; i++){
    //       //ensure that the user account exists
    //       var thisUser = Meteor.users.findOne(userIds[i]);
    //       if (!thisUser)
    //         throw new Meteor.Error(401, "Could not find user with id \""+userIds[i]+"\".");
    //     }
    //   }
    // }//end if (Meteor.isServer)

    if (modifier.$set.dueDuration !== "0") {
      // ensure the task has a name
      if (!modifier.$set.followUpName)
        throw new Meteor.Error(422, 'Please fill in a follow-up name');
    }

    modifier.$set.submitted = new Date().getTime();

    // may only edit the following fields:
    return (_.without(fieldNames, 'taskName', 'type', 'startTime', 'endTime', 'followUpName', 'slotDuration', 'dueDuration', 'location', 'prereqs', 'groups', 'users', 'emailList', 'emailCampaign', 'taskMaster', 'emailBody', 'emailTime', 'sms', 'smsTime', 'description', 'visible', 'emailSMS', 'googleCalendar', 'status', 'submitted').length > 0);
  }
});

Meteor.methods({
  task: function(taskAttributes) {
    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id)&&taskAttributes.type&&taskAttributes.type.toUpperCase()!=="RSVP")
      throw new Meteor.Error(401, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    // ensure the task has a name
    if (!taskAttributes.taskName)
      throw new Meteor.Error(422, 'Please fill in a Task name');

    // ensure the task has a taskMaster
    if (!taskAttributes.taskMaster)
      throw new Meteor.Error(422, 'Please fill in a valid Task master');

    // ensure the reservation has a type
    if (!taskAttributes.type)
      throw new Meteor.Error(422, 'Please fill in a valid type');

    // ensure the reservation has a status
    if (!taskAttributes.status)
      throw new Meteor.Error(422, 'Please fill in a valid status');

    // ensure end is after start
    if (moment(taskAttributes.startTime, "YYYY-MM-DD HH:mm:ss") > moment(taskAttributes.endTime, "YYYY-MM-DD HH:mm:ss"))
      throw new Meteor.Error(422, 'Please start cannot be after end');

    // pick out the whitelisted keys
    var task = _.extend(_.pick(taskAttributes, 'taskName', 'type', 'startTime', 'endTime', 'followUpName', 'slotDuration', 'dueDuration', 'location', 'status', 'prereqs', 'groups', 'users', 'resource', 'taskMaster', 'emailBody', 'emailTime', 'sms', 'smsTime', 'description', 'visible', 'emailSMS', 'googleCalendar'), {
      userId: user._id, 
      author: user.username, 
      submitted: new Date().getTime()
    });

    var taskId = Tasks.insert(task);

    if (task.dueDuration !== "0") {
      // ensure the task has a name
      if (!taskAttributes.followUpName)
        throw new Meteor.Error(422, 'Please fill in a follow-up name');

      Meteor.call('createFollowUpTasks', taskId);
    }

    return taskId;
  },

  removeFollowUpTasks: function(taskId) {
    var thisTask = Tasks.findOne(taskId);

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
          });//end forEach
        }
      });//end forEach      
    }
  },


  removeAllFromTasks: function(currentTaskId) {
    var currentTask = Tasks.findOne(currentTaskId);

    //find all the users that have this task
    var allTaskUsers = Meteor.users.find({tasks: currentTaskId});

    allTaskUsers.forEach(function (thisUser) {
      Meteor.users.update(
        //only update those with matching id
        {_id: thisUser._id}, 
        { 
          $pull: {tasks: currentTaskId}
        }
      );
      if (Meteor.isServer)
        unscheduleIt(thisUser, currentTask); 
    });//end forEach

    //find all the groups that have this task
    var allTaskGroups = Groups.find({tasks: currentTaskId});
    
    allTaskGroups.forEach(function (thisGroup) {
      Groups.update(
        //only update those with matching id
        {_id: thisGroup._id},
        {
          $pull: {tasks: currentTaskId}
        }
      );
      recursiveTaskFromGroup(thisGroup, currentTask);
    });//end forEach
  },


  addToTasks: function(taskId) {
    //Assume the task has been added to the collection by the time this function is run.
    var thisTask = Tasks.findOne(taskId);

    if (thisTask.users) {
      var allTaskUsers = Meteor.users.find({_id: {$in: thisTask.users}});
      allTaskUsers.forEach(function(thisUser) {
        Meteor.users.update({
          //only update those with matching id without already having the task
          _id: thisUser._id,
          tasks: {$ne: thisTask._id}
        }, {
          $addToSet: {tasks: thisTask._id}
        });

        if (Meteor.isServer)//SyncedCron runs on server only 
          if(thisTask.emailSMS||isStaff(thisUser._id))
            scheduleIt(thisUser, thisTask);
      });//end forEach      
    }

    if (thisTask.groups) {
      var allTaskGroups = Groups.find({_id: {$in: thisTask.groups}});
      allTaskGroups.forEach(function(thisGroup) {
        Groups.update({
          //only update those with matching id without already having the task
          _id: thisGroup._id,
          tasks: {$ne: thisTask._id}
        }, {
          $addToSet: {tasks: thisTask._id}
        });
        //schedule for every user in every subgroup
        recursiveTaskToGroup(thisGroup, thisTask);
      });//end forEach      
    }
  },

  //currently does not remove from Google Calendar Events
  //if task is edited and re-saved, the schedule will be added back for user
  deleteSchedule: function(scheduleId) {
    // ensure the user is staff
    if (!isStaff(Meteor.userId()))
      throw new Meteor.Error(401, "You need to be staff");

    var schedule = Schedules.findOne(scheduleId);
    var user = Meteor.users.findOne(schedule.userId);
    var task = Tasks.findOne(schedule.taskId);

    if(Meteor.isServer)
      unscheduleIt(user, task);  

  }
  
});

// on Client and Server
EasySearch.createSearchIndex('tasks', {
  'collection': Tasks, // instanceof Meteor.Collection
  'field': ['taskName', 'description', 'sms', 'emailBody', 'location', 'type', 'status'], // array of fields to be searchable
  'limit': 10,
  'use' : 'mongo-db',
  'convertNumbers': false,
  'props': {
    'filteredCategory': 'All'
  },
  'sort': function() {
    return { 'taskName': 1 };
  },
  'query': function(searchString) {
    // Default query that will be used for the mongo-db selector
    var query = EasySearch.getSearcher(this.use).defaultQuery(this, searchString);

    // filter for categories if set
    if (this.props.filteredCategory.toLowerCase() !== 'all') {
      query.category = this.props.filteredCategory;
    }

    return query;
  }
});

//subscribe user to this group and to every subgroup
//If a task has been independently assigned to a user,
//and that task is also associated with the group to be added,
//that task will not be duplicated to the user.
recursiveUserToGroup = function(group, user) {
    //schedule all tasks in this group to the user
    if (group.tasks) {
      var allGroupTasks = Tasks.find({_id: {$in: group.tasks}});
      allGroupTasks.forEach(function(thisTask) {
        if (Meteor.isServer)//SyncedCron runs on server only 
          if(thisTask.emailSMS||isStaff(user._id))
            scheduleIt(user, thisTask);
        //Add users to all tasks and all tasks to user
        Tasks.update({
          //only update those with matching id without already having the user
          _id: thisTask._id,
          users: {$ne: user._id}
        }, {
          $addToSet: {users: user._id}
        });
        Meteor.users.update({
          //only update those with matching id without already having the task
          _id: user._id,
          tasks: {$ne: thisTask._id}
        }, {
          $addToSet: {tasks: thisTask._id}
        });
      });      
    }


    //schedule to user from every supergroup
    var superGroups = Groups.find({subgroups: group._id});
    superGroups.forEach(function (thisGroup) {
      recursiveUserToGroup(thisGroup, user);
      //Add users to all supergroups and all supergroups to user
      Groups.update({
        //only update those with matching id without already having the group
        _id: thisGroup._id,
        users: {$ne: user._id}
      }, {
        $addToSet: {users: user._id}
      });

      Meteor.users.update({
        //only update those with matching id without already having the group
        _id: user._id,
        groups: {$ne: thisGroup._id}
      }, {
        $addToSet: {groups: thisGroup._id}
      });

      // //THIS IS A TACK-ON AND MAY BE BETTER IN ITS OWN FUNCTION
      // //OPPOSITE REMOVE FUNCTIONSHOULD ALSO BE IMPLEMENTED
      // //Add group to all supergroups 
      // Groups.update({
      //   //only update those with matching id without already having the group
      //   _id: thisGroup._id, //superGroup
      //   subgroups: {$ne: group._id}
      // }, {
      //   $addToSet: {subgroups: group._id}
      // });      
    });//end forEach

};

//unsubscribe user from this group and from every subgroup
//If a task has been independently assigned to a user,
//and that task is also associated with the group to be removed,
//that task will be removed from the user.
recursiveUserFromGroup = function(group, user) {
    //unschedule all tasks in this group from the user
    if (group.tasks) {
      var allGroupTasks = Tasks.find({_id: {$in: group.tasks}});
      allGroupTasks.forEach(function(thisTask) {
        if (Meteor.isServer)
          unscheduleIt(user, thisTask);
        Meteor.users.update(
          //only update those with matching id
          {_id: user._id}, 
          { 
            $pull: {tasks: thisTask._id}
          }
        );
        Tasks.update(
          //only update those with matching id
          {_id: thisTask._id}, 
          { 
            $pull: {users: user._id}
          }
        );
      }); //end forEach      
    }

    //unschedule from user every subgroup tasks
    if (group.subgroups) {
      var allGroupSubgroups = Groups.find({_id: {$in: group.subgroups}});
      allGroupSubgroups.forEach(function (thisGroup) {
        recursiveUserFromGroup(thisGroup, user);
        Groups.update(
          //only update those with matching id
          {_id: thisGroup._id}, 
          { 
            $pull: {users: user._id}
          }
        );
      }); //end forEach      
    }
};

//If a task has been independently assigned to a subgroup,
//and that task is also associated with the group to be added,
//that task will not be duplicated to the subgroup.
recursiveTaskToGroup = function(group, task) {

    //schedule for every user in group
    if (group.users) {
      var allGroupUsers = Meteor.users.find({_id: {$in: group.users}});
      allGroupUsers.forEach(function(thisUser) {  
        if (Meteor.isServer)//SyncedCron runs on server only 
          if(task.emailSMS||isStaff(thisUser._id))
            scheduleIt(thisUser, task);
        //Add users to all group tasks and all group tasks to user
        Meteor.users.update({
          //only update those with matching id without already having the task
          _id: thisUser._id,
          tasks: {$ne: task._id}
        }, {
          $addToSet: {tasks: task._id}
        }); 
        Tasks.update({
          //only update those with matching id without already having the user
          _id: task._id,
          users: {$ne: thisUser._id}
        }, {
          $addToSet: {users: thisUser._id}
        });
      }); //end forEach      
    }


    //schedule for every subgroup in group
    if (group.subgroups) {
      var allGroupSubgroups = Groups.find({_id: {$in: group.subgroups}});
      allGroupSubgroups.forEach(function(thisGroup) {  
        recursiveTaskToGroup(thisGroup, task);
        Groups.update({
          //only update those with matching id without already having the group
          _id: thisGroup._id,
          tasks: {$ne: task._id}
        }, {
          $addToSet: {tasks: task._id}
        });    
        Tasks.update({
          //only update those with matching id without already having the group
          _id: task._id,
          groups: {$ne: thisGroup._id}
        }, {
          $addToSet: {groups: thisGroup._id}
        });  
      }); //end forEach      
    }

};

//If a task has been independently assigned to a subgroup,
//and that task is also associated with the group to be removed from,
//that task will be removed from the subgroup.
recursiveTaskFromGroup = function(group, task) {
    //unschedule for every user in group
    if (group.users) {
      var allGroupUsers = Meteor.users.find({_id: {$in: group.users}});
      allGroupUsers.forEach(function(thisUser) {  
        unscheduleIt(thisUser, task);
        Meteor.users.update(
          //only update those with matching id
          {_id: thisUser._id}, 
          { 
            $pull: {tasks: task._id}
          }
        );
        Tasks.update(
          //only update those with matching id
          {_id: task._id}, 
          { 
            $pull: {users: thisUser._id}
          }
        );
      });//end forEach      
    }


    //unschedule for every subgroup in group
    if (group.subgroups) {
      var allGroupSubgroups = Groups.find({_id: {$in: group.subgroups}});
      allGroupSubgroups.forEach(function(thisGroup) { 
        recursiveTaskFromGroup(thisGroup, task);
        Groups.update(
          //only update those with matching id
          {_id: thisGroup._id}, 
          { 
            $pull: {tasks: task._id}
          }
        );
      }); //end forEach      
    }

};

