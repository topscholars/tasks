Template.userNew.helpers({
  typesList: function() {
    return userTypesList;
  },
  statusesList: function() {
    return userStatusesList;
  },

  showHeaders: function() {
    return !(Session.get("addUserToGroup")||Session.get("addUserToTask"));
  }
});

Template.userNew.rendered = function() {
  $('#datetimepickerBirth').datetimepicker({
    format: 'YYYY-MM-DD'
  });

  var tasks = new Bloodhound({
    datumTokenizer: function(d) {
      return Bloodhound.tokenizers.whitespace(d.label);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      // url points to a json file that contains an array of tokens
      url: '/tasks/JSON'
    }
  });

  //This seems to refresh my prefetch data
  tasks.clearPrefetchCache();
  //not sure whether setting to true does anything 
  //though, but according to the bloodhound.js it should force a reinitialise
  tasks.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

  // passing in `null` for the `options` arguments will result in the default
  // options being used
  $('#tokenfield-typeahead-tasks').tokenfield({
    typeahead: [null, { 
      name: 'tasks',
      displayKey: 'label',
      source: tasks.ttAdapter() 
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
    }]
  });

  var groups = new Bloodhound({
    datumTokenizer: function(d) {
      return Bloodhound.tokenizers.whitespace(d.label);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      // url points to a json file that contains an array of tokens
      url: '/groups/JSON'
    }
  });

  //This seems to refresh my prefetch data
  groups.clearPrefetchCache();
  //not sure whether setting to true does anything 
  //though, but according to the bloodhound.js it should force a reinitialise
  groups.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

  // passing in `null` for the `options` arguments will result in the default
  // options being used
  $('#tokenfield-typeahead-groups').tokenfield({
    typeahead: [null, { 
      name: 'groups',
      displayKey: 'label',
      source: groups.ttAdapter() 
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
    }]
  });

  if (Session.get("addUserToGroup")) {
    var group = Groups.findOne(Session.get("addUserToGroup"));
    if (group) {
      var token = [{value: group._id, label: group.groupName}];
      $('#tokenfield-typeahead-groups').tokenfield('setTokens', token);      
    }
  }

  if (Session.get("addUserToTask")) {
    var task = Tasks.findOne(Session.get("addUserToTask"));
    if (task) {
      var itemGroup = Groups.findOne({ _id: { $in: task.groups } });
      var groupName = "";
      if (itemGroup) groupName = " @"+itemGroup.groupName;
      var token = [{value: task._id, label: task.taskName + groupName}];
      $('#tokenfield-typeahead-tasks').tokenfield('setTokens', token);      
    }
  }

  var users = new Bloodhound({
    datumTokenizer: function(d) {
      return Bloodhound.tokenizers.whitespace(d.label);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      // url points to a json file that contains an array of tokens
      url: '/users/JSON'
    }
  });

  //This seems to refresh my prefetch data
  users.clearPrefetchCache();
  //not sure whether setting to true does anything 
  //though, but according to the bloodhound.js it should force a reinitialise
  users.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

  // passing in `null` for the `options` arguments will result in the default
  // options being used
  $('#tokenfield-typeahead-users').tokenfield({
    typeahead: [null, { 
      name: 'users',
      displayKey: 'label',
      source: users.ttAdapter() 
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
    }]
  });
};

Template.userNew.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
    //Split out the special characters
    //filter out the empty arrays if any
    //map the trim function to remove extra white spaces    
    var user = {
      firstName: $(event.target).find('[name=firstName]').val(),
      lastName: $(event.target).find('[name=lastName]').val(),
      nickName: $(event.target).find('[name=nickName]').val(),      
      type: $(event.target).find('[name=type]').val(),
      users: $(event.target).find('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim), 
      status: $(event.target).find('[name=status]').val(),      
      groups: $(event.target).find('[name=groups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      tasks: $(event.target).find('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      email: $(event.target).find('[name=email]').val(),
      email2: $(event.target).find('[name=email2]').val(),
      phone: $(event.target).find('[name=phone]').val(),
      birthdate: $(event.target).find('[name=birthdate]').val(),
      address1: $(event.target).find('[name=address1]').val(),
      address2: $(event.target).find('[name=address2]').val(), 
      city: $(event.target).find('[name=city]').val(), 
      state: $(event.target).find('[name=state]').val(), 
      postalCode: $(event.target).find('[name=postalCode]').val(),  
      country: $(event.target).find('[name=country]').val()
    };

    user.username = user.firstName + " " + user.lastName;
    if (user.nickName) user.username = user.firstName + " " + user.nickName + " " + user.lastName;

    Meteor.call('user', user, function(error, id) {
      if (error) {
        // display the error to the user
        throwError(error.reason);
        
        // if the error is that the user already exists, take us there
        if (error.error === 302)
          Router.go('userDisplay', {_errors: error.details})
      } else {
        Session.set("currentUserId", id);
        //Add new users to DB
        Meteor.call('addToUsers', id, function(error, id) {
          if (error) throwError(error.reason);
        }); 

        // //Update email
        // Meteor.call('updateEmail', id, function(error, id) {
        //   if (error) throwError(error.reason);
        // });   

        Router.go('userDisplay', {_id: id});
      }
    });
  }
});
