Template.userDisplay.onCreated(function () {
  var instance = this;

  instance.user = new ReactiveVar(null);

  instance.autorun(function () {
    var updatedAt = Session.get("updatedAt");
    Meteor.call("singleUser", Session.get('currentUserId'), function (error, result) {
      if (result) instance.user.set(result);
    });
  });
});

//DO NOT CONFUSE currentUserId with THE CURRENTLY SIGNED IN USER, Meteor.userId()

Template.userDisplay.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
};

Template.userDisplay.helpers({
  user: function() {
    return Template.instance().user.get();
  },
  viewTasks: function() {
    return Session.get("viewTasksByUser");
  },
  viewGroups: function() {
    return Session.get("viewGroupsByUser");
  },
  viewUsers: function() {
    return Session.get("viewUsersByUser");
  },
  viewEmails: function() {
    return Session.get("viewEmailsByUser");
  },
  viewCalls: function() {
    return Session.get("viewCallsByUser");
  },
  viewNotes: function() {
    return Session.get("viewNotesByUser");
  },
  showCommunications: function() {
    return (Template.instance().user.get().type!=="staff" && Template.instance().user.get().type!=="admin" );
  },
  addTask: function() {
    return Session.get("addTaskToUser");
  },
  addGroup: function() {
    return Session.get("addGroupToUser");
  }
});


Template.userDisplay.events({
  
  'click li.viewNotes.inactive': function(e) {
    e.preventDefault();
    $("#main-spinner").css('display', 'block');
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", Session.get('currentUserId'));
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);    

  },

  'click li.viewCalls.inactive': function(e, instance) {
    e.preventDefault();
    $("#main-spinner").css('display', 'block');
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", Session.get('currentUserId'));
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);
    Meteor.call('updateCalls', Session.get('currentUserId'));
    Session.set("updatedAt", moment().valueOf());
  },

  'click li.viewEmails.inactive': function(e, instance) {
    e.preventDefault();
    $("#main-spinner").css('display', 'block');
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", Session.get('currentUserId'));
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);    
    Meteor.call('updateGmails', Session.get('currentUserId'));
    Session.set("updatedAt", moment().valueOf());
  },

  'click li.viewGroups.inactive': function(e, instance) {
    e.preventDefault();
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", Session.get('currentUserId'));
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);
  },

  'click li.viewUsers.inactive': function(e, instance) {
    e.preventDefault();
    Session.set("viewUsersByUser", Session.get('currentUserId'));
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);
  },

  'click li.viewTasks.inactive': function(e, instance) {
    e.preventDefault();
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", Session.get('currentUserId')); 
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", false);
  },

  'click li.addTask.inactive': function(e, instance) {
    e.preventDefault();
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", Session.get('currentUserId'));
    Session.set("addGroupToUser", false);
  },

  'click li.addGroup.inactive': function(e, instance) {
    e.preventDefault();
    Session.set("viewUsersByUser", false);
    Session.set("viewGroupsByUser", false);
    Session.set("viewTasksByUser", false);
    Session.set("viewEmailsByUser", false);
    Session.set("viewCallsByUser", false);
    Session.set("viewNotesByUser", false);
    Session.set("addTaskToUser", false);
    Session.set("addGroupToUser", Session.get('currentUserId'));
  },

  'click #saveUserNote': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var userId = $(event.target).data('userid');

    var newNote = {
      text: $('[id=userNote'+userId+']').val(),
    }
    
    Meteor.call('addUserNote', newNote, userId);
    Session.set("updatedAt", moment().valueOf());

    $('#noteNewModal'+userId).modal('hide');
    $('[id=userNote'+userId+']').val("");
    $('[id=tokenfield-typeahead-staff'+userId+']').val("");
    $("#main-spinner").css('display', 'none');
  },

  'click #saveUserNoteAddTask': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var userId = $(event.target).data('userid');

    var newNote = {
      text: $('[id=userNote'+userId+']').val(),
    }
    
    Meteor.call('addUserNote', newNote, userId);
    Session.set("updatedAt", moment().valueOf());

    $('#noteNewModal'+userId).modal('hide');
    $('[id=userNote'+userId+']').val("");
    $('[id=tokenfield-typeahead-staff'+userId+']').val("");
    $("#main-spinner").css('display', 'none');
    
    $('#taskNewModal'+userId).modal('show');
    $('#taskNewModal'+userId).modal('handleUpdate');
  }

});

