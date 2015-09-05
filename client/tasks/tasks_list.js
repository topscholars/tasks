Template.tasksList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.sortBy = new ReactiveVar('taskName');
  instance.sortSelector= new ReactiveVar({"taskName": "asc", "type": "asc", "endTime": "asc"});
  instance.selector = new ReactiveVar({});
  instance.tasks = new ReactiveVar([]);
  instance.showLoadMore = new ReactiveVar(true);
  instance.updatedAt = new ReactiveVar(moment().valueOf());

  // Use self.subscribe with the data context reactively
  instance.autorun(function () {
    if (instance.data && instance.data.filter) {
      switch (instance.data.filter) {
        case "groups": instance.selector.set( {_id: {$in: instance.data.tasks} } ); break;
        case "users": instance.selector.set( {_id: {$in: instance.data.tasks} } ); break;
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
    Session.set("updatedAt", updatedAt);
    Meteor.call('tasksList', selector, options, function (error, result) {
      instance.tasks.set(result);
    });
    
  });
});

Template.tasksList.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
};

Template.tasksList.helpers({
	tasks: function() {
    if (Meteor.user().type!=="staff" && Meteor.user().type!=="admin") {
      var user = Meteor.user();

      var completedTasks = [];
      if (user.userTaskStatus) {
        completedTasks = user.userTaskStatus.map(function (thisTaskStatus) { 
          if (thisTaskStatus.status !== "incomplete") return thisTaskStatus.taskId; 
        });
      }

      var allUserTasks = Template.instance().tasks.get();
      var showTasks = [];
      
      allUserTasks.forEach(function (thisTask) {
        if (!thisTask.prereqs) showTasks.push(thisTask); 
        else {
          var prereqs = thisTask.prereqs;
          var pushTaskFlag = true;
          for(var i=0; i<prereqs.length; i++)
            if (completedTasks.indexOf(prereqs[i]) < 0) {
              pushTaskFlag = false;
              break;
            }
          if (pushTaskFlag) showTasks.push(thisTask);      
        }          
      });
  
      return showTasks;

    } else return Template.instance().tasks.get();
	},
  showHeaders: function() {
    return !(Session.get("viewTasksByUser")||Session.get("viewTasksByGroup"));
  },
  showTaskStatus: function() {
    return Session.get('viewTasksByUser');
  },
  sortTasksStatus: function(sortBy) {
    //console.log("Template.instance().sortSelector.get()[sortBy]",Template.instance().sortSelector.get()[sortBy])
    //console.log("Template.instance().sortSelector.get()",Template.instance().sortSelector.get())
    return Template.instance().sortSelector.get()[sortBy] === "asc" ? 'chevron-down' : 'chevron-up';
  },
  showLoadMore: function() {
    return Template.instance().showLoadMore.get();
  }
});

Template.tasksList.events({

  'click #taskType': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('type');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #endTime': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('endTime');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #taskName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('taskName');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click .load-more.tasks': function(e, instance) {
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
