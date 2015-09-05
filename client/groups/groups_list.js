Template.groupsList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.sortBy = new ReactiveVar('groupName');
  instance.sortSelector= new ReactiveVar({"groupName": "asc"});
  instance.selector = new ReactiveVar({});
  instance.groups = new ReactiveVar([]);
  instance.showLoadMore = new ReactiveVar(true);

  instance.autorun(function () {
    if (instance.data && instance.data.filter) {
      switch (instance.data.filter) {
        case "groups": instance.selector.set( {_id: {$in: instance.data.groups} } ); break;
        case "tasks": instance.selector.set( {_id: {$in: instance.data.groups} } ); break;
        case "users": instance.selector.set( {_id: {$in: instance.data.groups} } ); break;
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
    Meteor.call('groupsList', selector, options, function (error, result) {
      instance.groups.set(result);
    });
  });
});

Template.groupsList.helpers({
	groups: function() {
    return Template.instance().groups.get();
	},
  showHeaders: function() {
    return !(Session.get("viewGroupsByUser")||Session.get("viewGroupsByTask")||Session.get("viewGroupsByRSVP")||Session.get("viewGroupsByGroup"));
  },
  sortGroupsStatus: function(sortBy) {
    return Template.instance().sortSelector.get()[sortBy] === "asc" ? 'chevron-down' : 'chevron-up';
  },
  showLoadMore: function() {
    return Template.instance().showLoadMore.get();
  }
});

Template.groupsList.events({

  'click #groupName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('groupName');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click .load-more.groups': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  }

});
