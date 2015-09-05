Template.groupNew.helpers({
  showHeaders: function() {
    return !(Session.get("addGroupToUser")||Session.get("addSubgroupToGroup")||Session.get("addGroupToTask"));
  }
});

Template.groupNew.rendered = function() {
    var groupId = Session.get('currentGroupId');
    var thisGroup = Groups.findOne(groupId);
    
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

    var subgroups = new Bloodhound({
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
    subgroups.clearPrefetchCache();
    //not sure whether setting to true does anything 
    //though, but according to the bloodhound.js it should force a reinitialise
    subgroups.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

    // passing in `null` for the `options` arguments will result in the default
    // options being used
    $('#tokenfield-typeahead-subgroups').tokenfield({
      typeahead: [null, { 
        name: 'subgroups',
        displayKey: 'label',
        source: subgroups.ttAdapter() 
        // `ttAdapter` wraps the suggestion engine in an adapter that
        // is compatible with the typeahead jQuery plugin
      }]
    });

    if (Session.get("addSubgroupToGroup")) {
      var group = Groups.findOne(Session.get("addSubgroupToGroup"));
      if (group) {
        var token = [{value: group._id, label: group.groupName}];
        $('#tokenfield-typeahead-subgroups').tokenfield('setTokens', token);     
      }
      
    }

    if (Session.get("addGroupToUser")) {
      var user = Meteor.users.findOne(Session.get("addGroupToUser"));
      if (user) {
        var token = [{value: user._id, label: user.username + " <" + user.email + ">"}];
        $('#tokenfield-typeahead-users').tokenfield('setTokens', token);
      }
    }

    if (Session.get("addGroupToTask")) {
      var task = Tasks.findOne(Session.get("addGroupToTask"));
      if (task) {
        var itemGroup = Groups.findOne({ _id: { $in: task.groups } });
        var groupName = "";
        if (itemGroup) groupName = " @"+itemGroup.groupName;
        var token = [{value: task._id, label: task.taskName + groupName}];
        $('#tokenfield-typeahead-tasks').tokenfield('setTokens', token);      
      }

    }
};

Template.groupNew.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
   //Split out the special characters
    //filter out the empty arrays if any
    //map the trim function to remove extra white spaces    
    var group = {
      groupName: $(event.target).find('[name=groupName]').val(),
      subgroups: $(event.target).find('[name=subgroups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      tasks: $(event.target).find('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      users: $(event.target).find('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      description: $(event.target).find('[name=description]').val()
    };

    Meteor.call('addGroup', group, function(error, id) {
      if (error) {
        // display the error to the user
        throwError(error.reason);
        
        // if the error is that the group already exists, take us there
        if (error.error === 302)
          Router.go('groupDisplay', {_errors: error.details})
      } else {
        Session.set("currentGroupId", id);
        //Add new groups to DB
        Meteor.call('addToGroups', id, function(error) {
          if (error) throwError(error.reason);
          else Router.go('groupDisplay', {_id: id});
        });
      }
    });
  }
});
