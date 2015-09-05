
Template.dashboard.helpers({
  user: function() {
    return Meteor.user();
  },
  viewCalendar: function() {
    return Session.get("viewCalendarByUser");
  },
  viewTasks: function() {
    return Session.get("viewTasksByUser");
  },
  viewGroups: function() {
    return Session.get("viewGroupsByUser");
  },
  addTask: function() {
    return Session.get("addTaskToUser");
  },
  addGroup: function() {
    return Session.get("addGroupToUser");
  }
});

Template.dashboard.events({
  
  'click li.viewCalendar.inactive': function(e) {
    e.preventDefault();
    Session.set("viewCalendarByUser", Meteor.userId()); 
    Session.set("viewGroupsByUser", false);  
    Session.set("viewTasksByUser", false);
    Session.set("addTaskToUserByUser", false);
    Session.set("addGroupToUserByUser", false);
  },

  'click li.viewGroups.inactive': function(e) {
    e.preventDefault();
    Session.set("viewCalendarByUser", false); 
    Session.set("viewGroupsByUser", Meteor.userId());  
    Session.set("viewTasksByUser", false);
    Session.set("addTaskToUserByUser", false);
    Session.set("addGroupToUserByUser", false);
  },

  'click li.viewTasks.inactive': function(e) {
    e.preventDefault();
    Session.set("viewCalendarByUser", false); 
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", Meteor.userId());
    Session.set("addTaskToUserByUser", false);
    Session.set("addGroupToUserByUser", false);
  },

  'click li.addTask.inactive': function(e) {
    e.preventDefault();
    Session.set("viewCalendarByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("addTaskToUser", Meteor.userId());
    Session.set("addGroupToUser", false);
  },

  'click li.addGroup.inactive': function(e) {
    e.preventDefault();
    Session.set("viewCalendarByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", Meteor.userId());
  },

  'click .checkoff': function(e) {
    e.preventDefault();
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('checkOff', $(e.target).data('userid'), $(e.target).data('taskid'));//pass userId and taskId
  },

  'click .marklate': function(e) {
    e.preventDefault();
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('markLate', $(e.target).data('userid'), $(e.target).data('taskid'));//pass userId and taskId
  },

  'click .reset': function(e) {
    e.preventDefault();
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      if (confirm("Reset?"))
        Meteor.call('resetCheckOff', $(e.target).data('userid'), $(e.target).data('taskid')); //pass userId and taskId
  }
});

