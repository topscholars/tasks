
Template.noteTitle.helpers({
  dateTime: function() {
    return moment(this.submitted).format("YYYY-MM-DD HH:mm:ss");
  },
  textPreview: function() {
    var numPreview = 20;
    if (this.text.length > numPreview) return this.text.substr(0, numPreview)+"...";
    return this.text;
  }
});

Template.noteTitle.events({

  'click #saveUserNoteEdits': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var noteId = $(event.target).data('noteid');
    
    var text = $('[id=userNote'+noteId+']').val();

    Meteor.call('updateUserNote', noteId, text);

    $('#noteEditModal'+noteId).modal('hide');
    $("#main-spinner").css('display', 'none');
  },

  'click #saveUserNoteEditsAddTask': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var noteId = $(event.target).data('noteid');
    
    var text = $('[id=userNote'+noteId+']').val();

    Meteor.call('updateUserNote', noteId, text);

    $('#noteEditModal'+noteId).modal('hide');
    $("#main-spinner").css('display', 'none');
    
    $('#taskNewModal'+noteId).modal('show');
    $('#taskNewModal'+noteId).modal('handleUpdate');
  }
});