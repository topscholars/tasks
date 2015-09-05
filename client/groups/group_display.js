Template.groupDisplay.onCreated(function () {
  var instance = this;
  instance.group = new ReactiveVar({});
  Meteor.call('singleGroup', Session.get('currentGroupId'), function (error, result) {
    instance.group.set(result);
  });
});

Template.groupDisplay.helpers({
  group: function() {
    return Template.instance().group.get();
  },
  viewUsers: function() {
    return Session.get("viewUsersByGroup");
  },

  viewGroups: function() {
    return Session.get("viewGroupsByGroup");
  },

  viewTasks: function() {
    return Session.get("viewTasksByGroup");
  },

  addGroup: function() {
    return Session.get("addSubgroupToGroup");
  },

  addUser: function() {
    return Session.get("addUserToGroup");
  },

  addTask: function() {
    return Session.get("addTaskToGroup");
  }
});

Template.groupDisplay.events({

  'click li.viewGroups.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", Session.get('currentGroupId'));
    Session.set("viewUsersByGroup", false);
    Session.set("viewTasksByGroup", false);
    Session.set("addSubgroupToGroup", false);
    Session.set("addTaskToGroup", false);
    Session.set("addUserToGroup", false);
  },

  'click li.viewUsers.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", false);
    Session.set("viewUsersByGroup", Session.get('currentGroupId'));
    Session.set("viewTasksByGroup", false);
    Session.set("addSubgroupToGroup", false);
    Session.set("addTaskToGroup", false);
    Session.set("addUserToGroup", false);  
  },

  'click li.viewTasks.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", false);
    Session.set("viewUsersByGroup", false);
    Session.set("viewTasksByGroup", Session.get('currentGroupId'));
    Session.set("addSubgroupToGroup", false);
    Session.set("addTaskToGroup", false);
    Session.set("addUserToGroup", false);
  },

  'click li.addGroup.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", false);
    Session.set("viewUsersByGroup", false);
    Session.set("viewTasksByGroup", false);
    Session.set("addSubgroupToGroup", Session.get('currentGroupId'));
    Session.set("addTaskToGroup", false);
    Session.set("addUserToGroup", false);
  },

  'click li.addTask.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", false);
    Session.set("viewUsersByGroup", false);
    Session.set("viewTasksByGroup", false);
    Session.set("addSubgroupToGroup", false);
    Session.set("addTaskToGroup", Session.get('currentGroupId'));
    Session.set("addUserToGroup", false);
  },

  'click li.addUser.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByGroup", false);
    Session.set("viewUsersByGroup", false);
    Session.set("viewTasksByGroup", false);
    Session.set("addSubgroupToGroup", false);
    Session.set("addTaskToGroup", false);
    Session.set("addUserToGroup", Session.get('currentGroupId'));
  }

});
