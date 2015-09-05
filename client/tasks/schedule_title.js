Template.scheduleTitle.onCreated(function () {
  this.subscribe('singleUser', Template.currentData().userId);
  this.subscribe('singleTask', Template.currentData().taskId);
});


Template.scheduleTitle.helpers({


  taskName: function() {
    return Tasks.findOne(this.taskId).taskName;
  },

  username: function() {
    return Meteor.users.findOne(this.userId).username;
  },

  contentText: function() {
    return this.content.replace(/\n/g, ";");
  },
});

