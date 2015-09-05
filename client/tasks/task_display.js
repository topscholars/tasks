Template.taskDisplay.onCreated(function () {
  var instance = this;

  instance.task = new ReactiveVar(null);

  Meteor.call("singleTask", Session.get('currentTaskId'), function (error, result) {
    if (result) instance.task.set(result);
  });
});

Template.taskDisplay.helpers({
  task: function() {
    return Template.instance().task.get();
  },
  taskMaster: function() {
    if (!this.taskMaster || this.taskMaster.length<=0) return false;
    return Meteor.users.findOne(this.taskMaster);
  },
  viewUsers: function() {
    return Session.get("viewUsersByTask");
  },
  addUser: function() {
    return Session.get("addUserToTask");
  },
  addGroup: function() {
    return Session.get("addGroupToTask");
  },
  viewGroups: function() {
    return Session.get("viewGroupsByTask");
  },
  lastSaved: function() {
    return moment(this.submitted).format('YYYY-MM-DD HH:mm:ss');
  }
});


Template.taskDisplay.events({ 

  'click li.viewGroups.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByTask", Session.get('currentTaskId'));  
    Session.set("viewUsersByTask", false);
    Session.set("addUserToTask", false);  
    Session.set("addGroupToTask", false);  
  },

  'click li.viewUsers.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByTask", false);
    Session.set("viewUsersByTask", Session.get('currentTaskId')); 
    Session.set("addUserToTask", false); 
    Session.set("addGroupToTask", false); 
  },

  'click li.addUser.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByTask", false);
    Session.set("viewUsersByTask", false); 
    Session.set("addUserToTask", Session.get('currentTaskId'));  
    Session.set("addGroupToTask", false);        
  },

  'click li.addGroup.inactive': function(e) {
    e.preventDefault();
    Session.set("viewGroupsByTask", false);
    Session.set("viewUsersByTask", false); 
    Session.set("addUserToTask", false);  
    Session.set("addGroupToTask", Session.get('currentTaskId'));        
  },

  'click a#copyTask': function(e, instance) {
    e.preventDefault();

    var copiedTask = instance.task.get();

    var newName = prompt("New task name", copiedTask.taskName + " (copy)");
    if (!newName) return;
    
    $("#main-spinner").css('display', 'block');

    copiedTask.taskName = newName;

    Meteor.call('exchangeRefreshToken', copiedTask.taskMaster, function (error, result) {
      if (!error) {
        Meteor.call('task', copiedTask, function (error, id) {
          if (!error) {
            Session.set("currentTaskId", id);
            instance.subscribe('singleTask', id, function () {
              Meteor.call('addToTasks', id, function (error, result) {
                if (!error) {
                  if (copiedTask.googleCalendar)
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
  }
});
