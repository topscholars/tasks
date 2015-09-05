Template.usersList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.sortBy = new ReactiveVar('username');
  instance.sortSelector= new ReactiveVar({"firstName": "asc", "nickName": "asc", "lastName": "asc", "type": "asc", "username": "asc"});
  instance.selector = new ReactiveVar({});
  instance.users = new ReactiveVar([]);
  instance.showLoadMore = new ReactiveVar(true);
  instance.updatedAt = new ReactiveVar(moment().valueOf());

  // Use self.subscribe with the data context reactively
  instance.autorun(function () {
    if (instance.data && instance.data.filter) {
      switch (instance.data.filter) {
        case "groups": instance.selector.set( {_id: {$in: instance.data.users} } ); break;
        case "tasks": instance.selector.set( {_id: {$in: instance.data.users} } ); break;
        case "users": instance.selector.set( {_id: {$in: instance.data.users} } ); break;
      }
    }
    else {
      instance.selector.set({});
    }

    var limit = instance.limit.get();
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy];
    var selector = instance.selector.get();
    var options = {sort: [[sortBy, sortOrder]], limit: limit};
    var updatedAt = instance.updatedAt.get();
    Meteor.call('usersList', selector, options, function (error, result) {
      instance.users.set(result);
    });
  });

});

Template.usersList.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
};

Template.usersList.helpers({
  users: function() {
    return Template.instance().users.get();
  },
  showTaskStatus: function() {
    return Session.get('viewUsersByTask');
  },
  showHeaders: function() {
    return !(Session.get("viewUsersByGroup")||Session.get("viewUsersByUser")||Session.get("viewUsersByTask")||Session.get("viewUsersByRSVP"));
  },
  sortUsersStatus: function(sortBy) {
    return Template.instance().sortSelector.get()[sortBy] === "asc" ? 'chevron-down' : 'chevron-up';
  },
  showLoadMore: function() {
    return Template.instance().showLoadMore.get();
  }
});

Template.usersList.events({

  'click #firstName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('firstName');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #lastName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('lastName');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #nickName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('nickName');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #userType': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('type');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click .load-more.users': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  },

  'click a.incomplete': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      if (confirm("Reset?"))
        Meteor.call('userTaskStatus', userId, taskId, 'incomplete', function (error, result) {
          instance.updatedAt.set(moment().valueOf());
        }); //pass userId and taskId
  },
  'click a.completed': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('userTaskStatus', userId, taskId, 'completed', function (error, result) {
        instance.updatedAt.set(moment().valueOf());
      }); //pass userId and taskId
  },
  'click a.teamCompleted': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('userTaskStatus', userId, taskId, 'team completed', function (error, result) {
        instance.updatedAt.set(moment().valueOf());
      }); //pass userId and taskId
  },
  'click a.late': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('userTaskStatus', userId, taskId, 'late', function (error, result) {
        instance.updatedAt.set(moment().valueOf());
      }); //pass userId and taskId
  },
  'click a.excused': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('userTaskStatus', userId, taskId, 'excused', function (error, result) {
        instance.updatedAt.set(moment().valueOf());
      }); //pass userId and taskId
  },
  'click a.madeup': function(e, instance) {
    e.preventDefault();
    var userId = $(e.target).closest('a').data('userid');
    var taskId = $(e.target).closest('a').data('taskid');
    if (!userId || !taskId) {
      userId = $(e.target).data('userid');
      taskId = $(e.target).data('taskid');
    }
    if(Meteor.user().type==="staff" || Meteor.user().type==="admin") //non-staff click is ignored
      Meteor.call('userTaskStatus', userId, taskId, 'madeup', function (error, result) {
        instance.updatedAt.set(moment().valueOf());
      }); //pass userId and taskId
  }
});
