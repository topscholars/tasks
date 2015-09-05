Template.callsList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.calls = new ReactiveVar([]);
  instance.user = new ReactiveVar(null);
  instance.updatedAt = new ReactiveVar(moment().valueOf());

  // Use self.subscribe with the data context reactively
  instance.autorun(function () {
    var limit = instance.limit.get();
    var updatedAt = instance.updatedAt.get();
    Meteor.call("singleUser", Session.get("viewCallsByUser"), function (error, result) {
      if (result) instance.user.set(result);
      var phone = result.phone;
      Meteor.call('callsList', {$or: [{to:phone},{from:phone}] }, {sort: [["dateTime", "desc"]], limit: limit}, function (error, result) {
        instance.calls.set(result);
      });
    });
  });

});

Template.callsList.helpers({
  calls: function () {
    return Template.instance().calls.get();
  },
  showLoadMore: function() {
    return true;//Template.instance().calls.length >= Template.instance().limit.get();
  }
});


Template.callsList.events({

  'click .load-more.calls': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  },

  'click .refresh.calls': function(e, instance) {
    e.preventDefault();
    $("#main-spinner").css('display', 'block');
    Meteor.call('updateCalls', Session.get('currentUserId'), function (error, result) {
      if (error) throwError(error.reason);
      instance.updatedAt.set(moment().valueOf());
      $("#main-spinner").css('display', 'none');
    });  
  },


  'click #saveCallNote': function (event, instance) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var callId = $(event.target).data('callid');
    
    var callProperties = {
      staff: $('[id=tokenfield-typeahead-staff'+callId+']').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0]
    }

    Calls.update(callId, {$set: callProperties});
    var text = $('[id=callNote'+callId+']').val();

    var note = Notes.findOne({callId: callId});
    if (note) Meteor.call('updateUserNote', note._id, text);
    else {
      var newNote = {
        text: text,
        callId: callId
      }
      var noteId = Meteor.call('addUserNote', newNote, Session.get('currentUserId'));
      Calls.update(callId, {$set: {noteId: noteId}});
    }

    $('#callEditModal'+callId).modal('hide');
    $("#main-spinner").css('display', 'none');
  },

  'click #saveCallNoteAddTask': function (event, instance) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var callId = $(event.target).data('callid');
    
    var callProperties = {
      staff: $('[id=tokenfield-typeahead-staff'+callId+']').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0]
    }

    Calls.update(callId, {$set: callProperties});
    var text = $('[id=callNote'+callId+']').val();

    var note = Notes.findOne({callId: callId});
    if (note) Meteor.call('updateUserNote', note._id, text);
    else {
      var newNote = {
        text: text,
        callId: callId
      }
      var noteId = Meteor.call('addUserNote', newNote, Session.get('currentUserId'));
      Calls.update(callId, {$set: {noteId: noteId}});
    }

    $('#callEditModal'+callId).modal('hide');
    $("#main-spinner").css('display', 'none');
    
    $('#taskNewModal'+callId).modal('show');
    $('#taskNewModal'+callId).modal('handleUpdate');
  }
});
