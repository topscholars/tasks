Template.taskTitle.onCreated(function () {
  var instance = this;
  var task = instance.data;
  instance.slots = new ReactiveVar([]);
  instance.stagger = new ReactiveVar(false);
  instance.dates = new ReactiveVar([]);
  instance.subscribe('singleMeeting', task._id);
  if ((Meteor.user().type!=="staff" && Meteor.user().type!=="admin") && task.type.toLowerCase() === "appointment")
    instance.subscribe('singleUser', task.taskMaster);

  instance.user = new ReactiveVar(null);

  if (Template.parentData(2)) {
    Meteor.call("singleUser", Template.parentData(2), function (error, result) {
      if (result) instance.user.set(result);
    });
  }

  if (task.type.toLowerCase() === "appointment" && (Meteor.user().type!=="staff" && Meteor.user().type!=="admin")) {
    var start = moment(task.startTime);
    var end = moment(task.endTime);
    var dates = [];
    var allDates = [];
    var index = 0;

    console.log(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"))

    while (start < end) {
      allDates.push(start.format("YYYY-MM-DD"));
      Meteor.call('getAvailableSlots', instance.data._id, start.format(), instance.stagger.get(), function (error, result) {
        index++;
        if (error) throwError(error);
        else {
          if (result.length) {
            console.log(allDates[index]);
            dates.push(allDates[index]);
            instance.dates.set(dates);
          }
        }
      });
      start.add(1, "day");
    }
    
  }

});


Template.taskTitle.helpers({
  userExists: function(userId) {
    return Template.instance().user.get();
  },
  meetingDays: function() {
    return Template.instance().dates.get();
  },
  stagger: function() {
    return Template.instance().stagger.get();
  },
  slots: function () {
    // var existingMeeting = Meetings.findOne({task: this._id, attendee: Meteor.userId(), host: this.taskMaster});
    // if (existingMeeting) {
    //   var existingStart = moment(existingMeeting.start).format('YYYY-MM-DD HH:mm');
    //   var existingEnd = moment(existingMeeting.end).format('YYYY-MM-DD HH:mm');
    //   if (!Session.get("timeSlots")) return Session.get("timeSlots");
    //   var timeSlots = Session.get("timeSlots").map(function (thisSlot) {
    //     if (thisSlot.start !== existingStart && thisSlot.end !== existingEnd)
    //       return thisSlot;
    //   });
    //   return timeSlots;      
    // }
    return Template.instance().slots.get();
  },
  showMeetingMaker: function() {
    return this.type.toLowerCase() === "appointment";
  },
  meetings: function () {
    return Meetings.find({task: this._id, attendee: Meteor.userId()});
  },
  existingMeetings: function () {
    return Meetings.find({task: this._id, attendee: Meteor.userId()}).count() > 0;
  }

});

Template.taskTitle.events({
  
  'click a.meetingDay': function(e, instance) {
    e.preventDefault();
    $("#main-spinner").css('display', 'block');

    var date = $(e.target).closest('a').data('date');
    if (!date) date = $(e.target).data('date');

    Meteor.call('getAvailableSlots', instance.data._id, moment(date).format(), instance.stagger.get(), function (error, result) {
      if (error) throwError(error);
      else {
        instance.slots.set(result);
        $("a#makeAppointment").removeClass('disabled');
        $("#main-spinner").css('display', 'none');
      }
    });
  },

  'click a#stagger': function(e, instance) {
    e.preventDefault();
    if (!$("#slotsDayPicker"+this._id).data("DateTimePicker")) return;
    $("#main-spinner").css('display', 'block');
    instance.stagger.set(true);
    var date = $("#slotsDayPicker"+this._id).data("DateTimePicker").date().format();
    Meteor.call('getAvailableSlots', this._id, date, instance.stagger.get(), function (error, result) {
      if (error) throwError(error);
      else {
        //console.log("result: " + JSON.stringify(result));
        instance.slots.set(result);
        $("a#makeAppointment").removeClass('disabled');
        $("#main-spinner").css('display', 'none');
      }
    });
  },

  'click a#unstagger': function(e, instance) {
    e.preventDefault();
    if (!$("#slotsDayPicker"+this._id).data("DateTimePicker")) return;
    $("#main-spinner").css('display', 'block');
    instance.stagger.set(false);
    var date = $("#slotsDayPicker"+this._id).data("DateTimePicker").date().format();
    Meteor.call('getAvailableSlots', this._id, date, instance.stagger.get(), function (error, result) {
      if (error) throwError(error);
      else {
        //console.log("result: " + JSON.stringify(result));
        instance.slots.set(result);
        $("a#makeAppointment").removeClass('disabled');
        $("#main-spinner").css('display', 'none');
      }
    });
  },

  'click a#makeAppointment': function(e, instance) {
    e.preventDefault();
    var taskId = $(e.target).closest('a').data('taskid');
    var start = $(e.target).closest('a').data('start');
    var end = $(e.target).closest('a').data('end');

    if (!taskId || !start || !end) {
      taskId = $(e.target).data('taskid');
      start = $(e.target).data('start');
      end = $(e.target).data('end');
    }

    var date = $("#slotsDayPicker"+taskId).data("DateTimePicker").date().format();

    if (confirm(instance.data.taskName + " on " + start + "?"))
    {        
      $("#main-spinner").css('display', 'block');
      // $(e.target).closest('a').addClass('disabled');
      // $(e.target).closest('a').text('Reserving...');
      // $(e.target).closest('a').remove();
      Meteor.call('makeAppointment', Meteor.userId(), taskId, start, end, function (error, result) {
        if (error) throwError(error);
        else {
          $(e.target).closest('a').remove();
          Meteor.call('getAvailableSlots', taskId, date, instance.stagger.get(), function (error, result) {
            if (error) throwError(error);
            else {
              //console.log("result: " + JSON.stringify(result));
              instance.slots.set(result);
              $("#main-spinner").css('display', 'none');
            }
          });          
        }
      });
    }
  },

  'click a#cancelAppointment': function(e, instance) {
    e.preventDefault();
    var taskId = $(e.target).closest('a').data('taskid');

    var meetingId = $(e.target).closest('a').data('meetingid');

    if (!meetingId || !taskId) {
      meetingId = $(e.target).data('meetingid');
      taskId = $(e.target).data('taskid');
    }

    var date = $("#slotsDayPicker"+taskId).data("DateTimePicker").date() ? 
      $("#slotsDayPicker"+taskId).data("DateTimePicker").date().format() : 
      moment().format();

    if (confirm("Cancel appointment?")) {
      $("#main-spinner").css('display', 'block');
      $(e.target).closest('a').addClass('disabled');
      Meteor.call('cancelAppointment', meetingId, function (error, result) {
        if (error) throwError(error.reason);
        Meteor.call('getAvailableSlots', taskId, date, false, function (error, result) {
          if (error) throwError(error.reason);
          else {
            //console.log("result: " + JSON.stringify(result));
            instance.slots.set(result);
            $("#main-spinner").css('display', 'none');
          }
        });
      });
    }

  },

  'click a#copyTask': function(e, instance) {
    e.preventDefault();
    var taskId = $(e.target).closest('a').data('taskid');
    if (!taskId) taskId = $(e.target).data('taskid');

    instance.subscribe('singleTask', taskId, function () {
      var copiedTask = Tasks.findOne(taskId);

      var newName = prompt("New task name", copiedTask.taskName + " (copy)");
      if (!newName) return;

      $("#main-spinner").css('display', 'block');

      copiedTask.taskName = newName;

      Meteor.call('exchangeRefreshToken', copiedTask.taskMaster, function (error, result) {
        if (!error) {
          Meteor.call('task', copiedTask, function (error, id) {
            if (!error) {
              instance.subscribe('singleTask', id, function () {
                Meteor.call('addToTasks', id, function (error, result) {
                  if (!error) {
                    if (copiedTask.googleCalendar)
                      Meteor.call('insertGoogleEvent', id, function (error, result) {
                        if (error) throwError(error.reason);
                      });//end Meteor.call('insertGoogleEvent'
                    Router.go('taskEdit', {_id: id});
                  } else throwError(error.reason);
                });//Meteor.call('addToTasks'              
              });
            } else throwError(error.reason);
          });//Meteor.call('task'
        } else throwError(error.reason);
      });//Meteor.call('exchangeRefreshToken'
    });//instance.subscribe('singleTask', taskId, function () {
  },

  'click a#deleteTask': function(e, instance) {
    e.preventDefault();
    
    if (confirm("Delete this task?")) {
      $("#main-spinner").css('display', 'block');
      var taskId = $(e.target).closest('a').data('taskid');
      if (!taskId) taskId = $(e.target).data('taskid');

      instance.subscribe('singleTask', taskId, function () {
        var currentTask = Tasks.findOne(taskId);
        Meteor.call('exchangeRefreshToken', currentTask.taskMaster, function (error, result) {
          if (!error) {
            Meteor.call('removeAllFromTasks', taskId, function (error, id) {
              if (!error) {
                if (currentTask.googleCalendar)
                  Meteor.call('deleteGoogleEvent', taskId);
                Tasks.remove(taskId);
                $("#main-spinner").css('display', 'none');
              } else throwError(error.reason);
            });//Meteor.call('removeAllFromTasks'
          } else throwError(error.reason);
        });//Meteor.call('exchangeRefreshToken'
      });//instance.subscribe('singleTask', taskId, function () {

    }//end if delete
  }

});
