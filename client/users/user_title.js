Template.userTitle.onCreated(function (){
  var instance = this;

  instance.task = new ReactiveVar(null);

  if (Template.parentData(2)) {
    Meteor.call("singleTask", Template.parentData(2), function (error, result) {
      if (result) instance.task.set(result);
    });
  }

});


Template.userTitle.helpers({
  taskExists: function(taskId) {
    return Template.instance().task.get();
  },
  isStaffType: function(type) {
    return type==="staff" || type==="admin";
  }
});


Template.userTitle.events({
  'click #saveUserNote': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var userId = $(event.target).data('userid');

    var newNote = {
      text: $('[id=userNote'+userId+']').val(),
    }
    
    Meteor.call('addUserNote', newNote, userId);

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

    $('#noteNewModal'+userId).modal('hide');
    $('[id=userNote'+userId+']').val("");
    $('[id=tokenfield-typeahead-staff'+userId+']').val("");
    $("#main-spinner").css('display', 'none');
    
    $('#taskNewModal'+userId).modal('show');
    $('#taskNewModal'+userId).modal('handleUpdate');
  }
});