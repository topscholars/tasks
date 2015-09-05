Template.emailsList.onCreated(function () {

  var instance = this;

  // initialize the reactive variables
  instance.limit = new ReactiveVar(5);
  instance.selector = new ReactiveVar({});
  instance.user = new ReactiveVar(null);
  instance.gmails = new ReactiveVar([]);

  // Use self.subscribe with the data context reactively
  instance.autorun(function () {
    var selector = instance.selector.get();
    var limit = instance.limit.get();
    
    Meteor.call("singleUser", Session.get("viewEmailsByUser"), function (error, result) {
      if (result) instance.user.set(result);
      var user = result;
      var network = [Session.get("viewEmailsByUser")];
      if (user.users) network.push(user.users);
      instance.selector.set( {userId: {$in: network}} );

      Meteor.call('gmailsList', selector, {sort: [["date", "desc"]], limit: limit}, function (error, result) {
        instance.gmails.set(result);
      });
    });
  });

});

Template.emailsList.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});
};

Template.emailsList.helpers({
  gmails: function () {
    return Template.instance().gmails.get();
  },
  showLoadMore: function() {
    return true;//Template.instance().gmails.length >= Template.instance().limit.get();
  }
});

Template.emailsList.events({

  'click .load-more.emails': function(e, instance) {
    e.preventDefault();
    var newLimit = 10 + instance.limit.get();
    instance.limit.set(newLimit);
  }

});
