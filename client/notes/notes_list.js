Template.notesList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.sortBy = new ReactiveVar('submitted');
  instance.sortSelector= new ReactiveVar({"submitted": "asc", "author": "asc", "username": "asc"});
  instance.selector = new ReactiveVar({});
  instance.notes = new ReactiveVar([]);

  // Use self.subscribe with the data context reactively
  instance.autorun(function () {
    if (Session.get('viewNotesByUser')) instance.selector.set( {userId: Session.get('viewNotesByUser')} );
    else instance.selector.set({});

    var limit = instance.limit.get();
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy];
    var selector = instance.selector.get();
    var options = {sort: [[sortBy, sortOrder]], limit: limit};
    Meteor.call('notesList', selector, options, function (error, result) {
      instance.notes.set(result);
    });
  });
});

Template.notesList.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
};


Template.notesList.helpers({
  showHeaders: function() {
    return !(Session.get("viewNotesByUser"));
  },
  notes: function () {
    return Template.instance().notes.get();
  },
  sortNotesStatus: function(sortBy) {
    return Template.instance().sortSelector.get()[sortBy] === "asc" ? 'chevron-down' : 'chevron-up';
  },
  showLoadMore: function() {
    return true;//Template.instance().notes.get().length >= Template.instance().limit.get();
  }
});

Template.notesList.events({
  'click #timeStamp': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('submitted');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #authorName': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('author');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click #username': function(e, instance) {
    e.preventDefault();
    instance.sortBy.set('username');
    var sortBy = instance.sortBy.get();
    var sortOrder = instance.sortSelector.get()[sortBy]==="asc" ? "desc" : "asc";
    var sortSelector = instance.sortSelector.get();
    sortSelector[sortBy] = sortOrder;
    instance.sortSelector.set(sortSelector);
  },

  'click .load-more.notes': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  },


});
