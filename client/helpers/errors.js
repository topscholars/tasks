// Local (client-only) collection
Errors = new Mongo.Collection(null);

throwError = function(message) {
  $("#main-spinner").css('display', 'none');
  Errors.insert({message: message, seen: false})
};

removeSeenErrors = function() {
  Errors.remove({seen: true});
};

Template.errors.helpers({
  errors: function() {
    return Errors.find();
  }
});

Template.error.rendered = function() {
  var error = this.data;
  Meteor.defer(function() {
    Errors.update(error._id, {$set: {seen: true}});
  });
};

