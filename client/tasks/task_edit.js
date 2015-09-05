Template.taskEdit.onCreated(function () {
  var instance = this;
  instance.autorun(function () {
    var subscription = instance.subscribe('singleTask', Session.get('currentTaskId'));
    if (subscription.ready()) {
      Tracker.afterFlush(function() {
        $('#datetimepickerStart').datetimepicker({
          format: 'YYYY-MM-DD HH:mm'
        });
        $('#datetimepickerEnd').datetimepicker({
          format: 'YYYY-MM-DD HH:mm'
        });
        $('#datetimepickerEmail').datetimepicker({
          format: 'YYYY-MM-DD HH:mm'
        });
        $('#datetimepickerSMS').datetimepicker({
          format: 'YYYY-MM-DD HH:mm'
        });
        $("#datetimepickerStart").on("dp.change", function (e) {
            $('#datetimepickerEnd').data("DateTimePicker").minDate(e.date);
        });
        $("#datetimepickerEnd").on("dp.change", function (e) {
            $('#datetimepickerStart').data("DateTimePicker").maxDate(e.date);
        });

        var tasks = new Bloodhound({
          datumTokenizer: function(d) {
            return Bloodhound.tokenizers.whitespace(d.label);
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          limit: 20,
          prefetch: {
            // url points to a json file that contains an array of tokens
            url: '/tasks/JSON'
          }
        });

        //This seems to refresh my prefetch data
        tasks.clearPrefetchCache();
        //not sure whether setting to true does anything 
        //though, but according to the bloodhound.js it should force a reinitialise
        tasks.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

        // passing in `null` for the `options` arguments will result in the default
        // options being used
        $('#tokenfield-typeahead-tasks').tokenfield({
          typeahead: [null, { 
            name: 'tasks',
            displayKey: 'label',
            source: tasks.ttAdapter() 
            // `ttAdapter` wraps the suggestion engine in an adapter that
            // is compatible with the typeahead jQuery plugin
          }]
        });

        var users = new Bloodhound({
          datumTokenizer: function(d) {
            return Bloodhound.tokenizers.whitespace(d.label);
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          limit: 20,
          prefetch: {
            // url points to a json file that contains an array of tokens
            url: '/users/JSON'
          }
        });

        //This seems to refresh my prefetch data
        users.clearPrefetchCache();
        //not sure whether setting to true does anything 
        //though, but according to the bloodhound.js it should force a reinitialise
        users.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

        // passing in `null` for the `options` arguments will result in the default
        // options being used
        $('#tokenfield-typeahead-users').tokenfield({
          typeahead: [null, { 
            name: 'users',
            displayKey: 'label',
            source: users.ttAdapter() 
            // `ttAdapter` wraps the suggestion engine in an adapter that
            // is compatible with the typeahead jQuery plugin
          }]
        });

        // passing in `null` for the `options` arguments will result in the default
        // options being used
        $('#tokenfield-typeahead-taskMaster').tokenfield({
          typeahead: [null, { 
            name: 'users',
            displayKey: 'label',
            source: users.ttAdapter() 
            // `ttAdapter` wraps the suggestion engine in an adapter that
            // is compatible with the typeahead jQuery plugin
          }]
        });

        var groups = new Bloodhound({
          datumTokenizer: function(d) {
            return Bloodhound.tokenizers.whitespace(d.label);
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          limit: 20,
          prefetch: {
            // url points to a json file that contains an array of tokens
            url: '/groups/JSON'
          }
        });

        //This seems to refresh my prefetch data
        groups.clearPrefetchCache();
        //not sure whether setting to true does anything 
        //though, but according to the bloodhound.js it should force a reinitialise
        groups.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

        // passing in `null` for the `options` arguments will result in the default
        // options being used
        $('#tokenfield-typeahead-groups').tokenfield({
          typeahead: [null, { 
            name: 'groups',
            displayKey: 'label',
            source: groups.ttAdapter() 
            // `ttAdapter` wraps the suggestion engine in an adapter that
            // is compatible with the typeahead jQuery plugin
          }]
        });

        var thisTask = Tasks.findOne(Session.get('currentTaskId'));
        if (thisTask.taskMaster) {
          instance.subscribe('singleUser', thisTask.taskMaster, function () {
            var taskMaster = Meteor.users.findOne(thisTask.taskMaster);
            var token = [{value: taskMaster._id, label: taskMaster.username + " <" + taskMaster.email + ">"}];
            $('#tokenfield-typeahead-taskMaster').tokenfield('setTokens', token);  
          });
        }

        if (thisTask.users) {
          instance.subscribe('usersList', {_id: {$in: thisTask.users}}, {sort: [["username","asc"]]}, function () {
            var taskUsers = Meteor.users.find({ _id: { $in: thisTask.users } });
            var tokens = taskUsers.map(function(item){ return {value: item._id, label: item.username + " <" + item.email + ">"}; });
            $('#tokenfield-typeahead-users').tokenfield('setTokens', tokens);  
          }); 
        }

        if (thisTask.groups) {
          instance.subscribe('groupsList', {_id: {$in: thisTask.groups}}, {sort: [["groupName","asc"]]}, function () {
            var taskGroups = Groups.find({ _id: { $in: thisTask.groups } });
            var tokens = taskGroups.map(function(item){ return {value: item._id, label: item.groupName}; });
            $('#tokenfield-typeahead-groups').tokenfield('setTokens', tokens);  
          });
        }
      });
    }
  });

  instance.task = function() { 
    return Tasks.findOne(Session.get('currentTaskId'));
  };
});

Template.taskEdit.helpers({
  task: function() {
    return Template.instance().task();
  },
  lastSaved: function() {
    return moment(Template.currentData().submitted).format('YYYY-MM-DD HH:mm:ss');
  }
});

var refreshAutocompleteFields = function (taskId) {
  var thisTask = Tasks.findOne(taskId);
  var taskMaster = Meteor.users.findOne(thisTask.taskMaster);
  if (taskMaster) {
    var token = [{value: taskMaster._id, label: taskMaster.username + " <" + taskMaster.email + ">"}];
    $('#tokenfield-typeahead-taskMaster').tokenfield('setTokens', token);
  }

  if (thisTask.users) {
    var taskUsers = Meteor.users.find({ _id: { $in: thisTask.users } });
    var tokens = taskUsers.map(function(item){ return {value: item._id, label: item.username + " <" + item.email + ">"}; });
    $('#tokenfield-typeahead-users').tokenfield('setTokens', tokens);      
  }

  if (thisTask.groups) {
    var taskGroups = Groups.find({ _id: { $in: thisTask.groups } });
    var tokens = taskGroups.map(function(item){ return {value: item._id, label: item.groupName}; });
    $('#tokenfield-typeahead-groups').tokenfield('setTokens', tokens);      
  }
};

Template.taskEdit.events({

  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var currentTaskId = Session.get('currentTaskId');
    var currentTask = Tasks.findOne(Session.get('currentTaskId'));
    var currentTaskGoogleCalendar = currentTask.googleCalendar;
   
    var taskProperties = {
      taskName: $(event.target).find('[name=taskName]').val(),
      taskMaster: $(event.target).find('[name=taskMaster]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0],
      prereqs: $(event.target).find('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      type: $(event.target).find('[name=type]').val(),
      startTime: getUTCString($(event.target).find('[name=startTime]').val()),   
      endTime: getUTCString($(event.target).find('[name=endTime]').val()),  
      followUpName: $(event.target).find('[name=followUpName]').val(),
      dueDuration: $(event.target).find('[name=dueDuration]').val(),
      slotDuration: $(event.target).find('[name=slotDuration]').val(),
      location: $(event.target).find('[name=location]').val(),     
      status: $(event.target).find('[name=status]').val(),      
      groups: $(event.target).find('[name=groups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      users: $(event.target).find('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      emailBody: $(event.target).find('[name=emailBody]').val(),
      emailTime: getUTCString($(event.target).find('[name=emailTime]').val()),   
      sms: $(event.target).find('[name=sms]').val(),
      smsTime: getUTCString($(event.target).find('[name=smsTime]').val()),   
      description: $(event.target).find('[name=description]').val(),
      visible: false,
      emailSMS: false,
      googleCalendar: false
    };

    if($('#makeVisible').is(':checked')) taskProperties.visible = true;
    if($('#makeEmailSMS').is(':checked')) taskProperties.emailSMS = true;
    if($('#makeGoogleCalendar').is(':checked')) taskProperties.googleCalendar = true;

    //perhaps exchangeRefreshToken every 45 minutes is better, but it may interfere due to non-atomic operations
    Meteor.call('exchangeRefreshToken', taskProperties.taskMaster, function (error, result) {
      if (!error) {
        Tasks.update(currentTaskId, {$set: taskProperties}, function (error, result) {
          if (!error) {
            Meteor.call('removeAllFromTasks', currentTaskId, function (error, result) {
              if (!error) {
                Meteor.call('addToTasks', currentTaskId, function (error, result) {
                  if (!error) {
                    if (taskProperties.dueDuration !== "0")
                      Meteor.call('createFollowUpTasks', currentTaskId);

                    if (taskProperties.googleCalendar && currentTaskGoogleCalendar) {
                      Meteor.call('deleteGoogleEvent', currentTaskId);
                      Meteor.call('insertGoogleEvent', currentTaskId);
                    }
                    else if (taskProperties.googleCalendar && !currentTaskGoogleCalendar)
                      Meteor.call('insertGoogleEvent', currentTaskId, function (error, result) {
                        if (error) throwError(error.reason);
                      });//end Meteor.call('insertGoogleEvent'
                    else if (!taskProperties.googleCalendar && currentTaskGoogleCalendar)
                      Meteor.call('deleteGoogleEvent', currentTaskId, function (error, result) {
                        if (error) throwError(error.reason);
                      });//end Meteor.call('deleteGoogleEvent'
                    $("#main-spinner").css('display', 'none');
                    Router.go('taskEdit', {_id: currentTaskId});
                  } else throwError(error.reason);
                });//end Meteor.call('addToTasks'
              } else throwError(error.reason);
            });//end Meteor.call('removeAllFromTasks'
          } else throwError(error.reason);
        });//end Tasks.update
      } else throwError(error.reason);
    });//end Meteor.call('exchangeRefreshToken'
  },

  'click a#saveTask': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var currentTaskId = Session.get('currentTaskId');
    var currentTask = Tasks.findOne(Session.get('currentTaskId'));
    var currentTaskGoogleCalendar = currentTask.googleCalendar;
   
    var taskProperties = {
      taskName: $('[name=taskName]').val(),
      taskMaster: $('[name=taskMaster]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0],
      prereqs: $('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      type: $('[name=type]').val(),
      startTime: getUTCString($('[name=startTime]').val()),   
      endTime: getUTCString($('[name=endTime]').val()), 
      followUpName: $(event.target).find('[name=followUpName]').val(),
      dueDuration: $('[name=dueDuration]').val(),
      slotDuration: $('[name=slotDuration]').val(), 
      location: $('[name=location]').val(),     
      status: $('[name=status]').val(),      
      groups: $('[name=groups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      users: $('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      emailBody: $('[name=emailBody]').val(),
      emailTime: getUTCString($('[name=emailTime]').val()),   
      sms: $('[name=sms]').val(),
      smsTime: getUTCString($('[name=smsTime]').val()),   
      description: $('[name=description]').val(),
      visible: false,
      emailSMS: false,
      googleCalendar: false
    };

    if($('#makeVisible').is(':checked')) taskProperties.visible = true;
    if($('#makeEmailSMS').is(':checked')) taskProperties.emailSMS = true;
    if($('#makeGoogleCalendar').is(':checked')) taskProperties.googleCalendar = true;

    //perhaps exchangeRefreshToken every 45 minutes is better, but it may interfere due to non-atomic operations
    Meteor.call('exchangeRefreshToken', taskProperties.taskMaster, function (error, result) {
      if (!error) {
        Tasks.update(currentTaskId, {$set: taskProperties}, function (error, result) {
          if (!error) {
            Meteor.call('removeAllFromTasks', currentTaskId, function (error, result) {
              if (!error) {
                Meteor.call('addToTasks', currentTaskId, function (error, result) {
                  if (!error) {
                    if (taskProperties.dueDuration !== "0")
                      Meteor.call('createFollowUpTasks', currentTaskId);

                    if (taskProperties.googleCalendar && currentTaskGoogleCalendar) {
                      Meteor.call('deleteGoogleEvent', currentTaskId);
                      Meteor.call('insertGoogleEvent', currentTaskId);
                    }
                    else if (taskProperties.googleCalendar && !currentTaskGoogleCalendar)
                      Meteor.call('insertGoogleEvent', currentTaskId, function (error, result) {
                        if (error) throwError(error.reason);
                      });//end Meteor.call('insertGoogleEvent'
                    else if (!taskProperties.googleCalendar && currentTaskGoogleCalendar)
                      Meteor.call('deleteGoogleEvent', currentTaskId, function (error, result) {
                        if (error) throwError(error.reason);
                      });//end Meteor.call('deleteGoogleEvent'
                    Session.set("taskSaved", true);
                    refreshAutocompleteFields(currentTaskId);
                    $("#main-spinner").css('display', 'none');
                    Router.go('taskEdit', {_id: currentTaskId});
                  } else throwError(error.reason);
                });//end Meteor.call('addToTasks'
              } else throwError(error.reason);
            });//end Meteor.call('removeAllFromTasks'
          } else throwError(error.reason);
        });//end Tasks.update
     } else throwError(error.reason);
    });//end Meteor.call('exchangeRefreshToken'
  },

  'click a#copyTask': function(e, instance) {
    e.preventDefault();

    var newName = prompt("New task name", $('[name=taskName]').val() + " (copy)");
    if (!newName) return;

    $("#main-spinner").css('display', 'block');

    var taskProperties = {
      taskName: newName,
      taskMaster: $('[name=taskMaster]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0],
      prereqs: $('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      type: $('[name=type]').val(),
      startTime: getUTCString($('[name=startTime]').val()),   
      endTime: getUTCString($('[name=endTime]').val()), 
      followUpName: $(event.target).find('[name=followUpName]').val(),
      dueDuration: $('[name=dueDuration]').val(),
      slotDuration: $('[name=slotDuration]').val(), 
      location: $('[name=location]').val(),     
      status: $('[name=status]').val(),      
      groups: $('[name=groups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      users: $('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      emailBody: $('[name=emailBody]').val(),
      emailTime: getUTCString($('[name=emailTime]').val()),   
      sms: $('[name=sms]').val(),
      smsTime: getUTCString($('[name=smsTime]').val()),   
      description: $('[name=description]').val(),
      visible: false,
      emailSMS: false,
      googleCalendar: false
    };

    if($('#makeVisible').is(':checked')) taskProperties.visible = true;
    if($('#makeEmailSMS').is(':checked')) taskProperties.emailSMS = true;
    if($('#makeGoogleCalendar').is(':checked')) taskProperties.googleCalendar = true;

    Meteor.call('exchangeRefreshToken', taskProperties.taskMaster, function (error, result) {
      if (!error) {
        Meteor.call('task', taskProperties, function (error, id) {
          if (!error) {
            Session.set("currentTaskId", id);
            instance.subscribe('singleTask', id, function () {
              Meteor.call('addToTasks', id, function (error, result) {
                if (!error) {
                  if (taskProperties.dueDuration !== "0")
                    Meteor.call('createFollowUpTasks', currentTaskId);
                  if (taskProperties.googleCalendar)
                    Meteor.call('insertGoogleEvent', id, function (error, result) {
                      if (error) throwError(error.reason);
                    });//end Meteor.call('insertGoogleEvent'
                  Router.go('taskEdit', {_id: id});
                } else throwError(error.reason);
              });//end Meteor.call('addToTasks'              
            });
          } else throwError(error.reason);
        });//end Meteor.call('task'
      } else throwError(error.reason);
    });//Meteor.call('exchangeRefreshToken'
  },

  'click .delete': function(e) {
    e.preventDefault();
    
    if (confirm("Delete this task?")) {
      $("#main-spinner").css('display', 'block');
      
      var currentTaskId = Session.get('currentTaskId');
      var currentTask = Tasks.findOne(currentTaskId);

      Meteor.call('exchangeRefreshToken', currentTask.taskMaster, function (error, result) {
        if (!error) {
          Meteor.call('removeAllFromTasks', currentTaskId, function (error, id) {
            if (!error) {
              if (currentTask.googleCalendar)
                Meteor.call('deleteGoogleEvent', currentTaskId);

              Meteor.call('removeFollowUpTasks', currentTaskId);
              Tasks.remove(currentTaskId);
              Router.go('tasksList');     
            } else throwError(error.reason);
          });//end Meteor.call('removeAllFromTasks'
        } else throwError(error.reason);
      });//end Meteor.call('exchangeRefreshToken'
    }//end if delete
  },

  'click .autoEmail': function(event) {
    event.preventDefault();

    var message;
    var taskMaster = Meteor.users.findOne($('[name=taskMaster]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0]);
    var username = "";
    if (taskMaster) username = taskMaster.username;
    console.log("AUTOEMAIL USERNAME: " + username);
    var endTime = $('[name=endTime]').val();
    var startTime = $('[name=startTime]').val();
    var type = $('[name=type]').val();
    var emailTime = $('[name=startTime]').val();
    console.log("AUTOEMAIL TYPE: " + type);
    switch( type ) {
      case "homework":
        message = "Hey Everyone,\r\n\r\nGreat session today! By " + 
                friendlyTime(endTime) + 
                ", please complete the following for homework: \r\n\r\n" +
                $('[name=description]').val() + "\r\n\r\n" +
                "Feel free to email me with any questions. Good luck!\r\n\r\n" + 
                username;
        emailTime = homeworkAutoTime(endTime);
        break;
      case "course":
        message = "Hey Everyone,\r\n\r\nThis is a friendly reminder. Don't forget your " +
                $('[name=taskName]').val() + " on " + friendlyTime(startTime) + 
                " at " +  $('[name=location]').val() + ".\r\n\r\n" +
                "Feel free to email me with any questions. See you there!\r\n\r\n" + 
                username;
        emailTime = homeworkAutoTime(startTime);
        break;
      default:
        emailTime = homeworkAutoTime(startTime);
        message = $('[name=taskName]').val() + " at " + $('[name=location]').val() + " on " + friendlyTime(startTime);
    }
    console.log("AUTOEMAIL MESSAGE: " + message);
    console.log("AUTOEMAIL TIME: " + emailTime);
    $('[name=emailBody]').val(message);
    $('[name=emailTime]').val(emailTime);
  },

  'click .autoSMS': function(event) {
    event.preventDefault();
    var message;
    var taskMaster = Meteor.users.findOne($('[name=taskMaster]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0]);
    var username = "";
    if (taskMaster) username = taskMaster.username;
    console.log("AUTOSMS USERNAME: " + username);
    var endTime = $('[name=endTime]').val();
    var startTime = $('[name=startTime]').val();
    var type = $('[name=type]').val();
    var smsTime = $('[name=startTime]').val();
    console.log("AUTOSMS TYPE: " + type);
    switch( type ) {
      case "homework":
        message = "Great class today. Please complete the following for homework" + 
                  " by " + friendlyTime(endTime) + ": " + $('[name=description]').val();
        smsTime = smsAutoTime(endTime);
        break;
      case "course":
        message = "Don't forget your " +
                $('[name=taskName]').val() + " on " + friendlyTime(startTime) + 
                " at " + $('[name=location]').val();
        smsTime = smsAutoTime(startTime);
        break;
      default:
        message = $('[name=taskName]').val() + " at " + $('[name=location]').val() + " on " + friendlyTime(startTime);
        smsTime = smsAutoTime(startTime);
    }
    console.log("AUTOSMS MESSAGE: " + message);
    console.log("AUTOSMS TIME: " + smsTime);
    $('[name=sms]').val(message);
    $('[name=smsTime]').val(smsTime);
  }
});
