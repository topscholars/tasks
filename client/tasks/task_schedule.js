Template.taskSchedule.onCreated(function () {
  var instance = this;
  instance.limit = new ReactiveVar(5); 
  instance.schedules = new ReactiveVar([]);   

  // Use instance.subscribe with the data context reactively
  instance.autorun(function () {
    var limit = instance.limit.get();
    Meteor.call('schedulesList', {}, { sort: [["time", "desc"]], limit: limit}, function (error, result) {
      instance.schedules.set(result);
    });
  });

});

Template.taskSchedule.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
}

Template.taskSchedule.helpers({
	taskSchedules: function() {
		return Template.instance().schedules.get();
	},
  showLoadMore: function() {
    return true;// Template.instance().schedules.length >= Template.instance().limit.get();
  }
});

Template.taskSchedule.events({

  'click .load-more.schedules': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  },

  'click a.deleteSchedule': function(e, instance) {
    e.preventDefault();

    var scheduleId = $(e.target).data('scheduleid');
    var taskId = $(e.target).data('taskId');
    var userId = $(e.target).data('userId');

    var schedule = Schedules.findOne(scheduleId);
    var user = Meteor.users.findOne(userId);
    var task = Tasks.findOne(taskId);

    if (confirm("Delete " + task.taskName + " email/SMS scheduled for " + user.username + "?")) {
      $("#main-spinner").css('display', 'block');
      Meteor.call('exchangeRefreshToken', task.taskMaster, function (error, result) {
        if (!error) Meteor.call('deleteSchedule', scheduleId, function (error, result) {
          if (error) throwError(error.reason);
          else $("#main-spinner").css('display', 'none');
        });
        else throwError(error.reason);
      });//end Meteor.call('exchangeRefreshToken'      
    }
  }
});