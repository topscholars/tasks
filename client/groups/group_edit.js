Template.groupEdit.onCreated(function () {
  var instance = this;
  instance.group = new ReactiveVar({});
  Meteor.call('singleGroup', Session.get('currentGroupId'), function (error, result) {
    instance.group.set(result);
    Tracker.afterFlush(function() {
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

      var thisGroup = instance.group.get();
      if (thisGroup.tasks) {
        Meteor.call('tasksList', { _id: { $in: thisGroup.tasks } }, {sort: [["taskName","asc"]]}, function (error, result) {
          var groupTasks = result;
          var groupTaskGroups = groupTasks.map(function (thisTask) {
            return thisTask.groups ? thisTask.groups[0] : "";
          });            
          Meteor.call('groupsList', { _id: { $in: groupTaskGroups } }, {sort: [["groupName","asc"]]}, function (error, result) {
            var tokens = groupTasks.map(function (item){ 
              var itemGroup = result[0];
              var groupName = "";
              if (itemGroup) groupName = " @"+itemGroup.groupName;
              return {value: item._id, label: item.taskName + groupName}; 
            });
            $('#tokenfield-typeahead-tasks').tokenfield('setTokens', tokens);    
          });
        });
      }

      if (thisGroup.users) {
        Meteor.call('usersList', { _id: { $in: thisGroup.users } }, {sort: [["username","asc"]]}, function (error, result) {
          var groupUsers = result;
          var tokens = groupUsers.map(function(item){ return {value: item._id, label: item.username + " <" + item.email + ">"}; });
          $('#tokenfield-typeahead-users').tokenfield('setTokens', tokens);      
        });
      }

      if (thisGroup.subgroups) {
        Meteor.call('groupsList', { _id: { $in: thisGroup.subgroups } }, {sort: [["groupName","asc"]]}, function (error, result) {
          var subgroups = result;
          var tokens = subgroups.map(function(item){ return {value: item._id, label: item.groupName}; });
          $('#tokenfield-typeahead-subgroups').tokenfield('setTokens', tokens);      
        });
      }
    });
  });
});


Template.groupEdit.helpers({
  group: function() {
    return Template.instance().group.get();
  }
});

Template.groupEdit.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
    var currentGroupId = Session.get('currentGroupId');
    
    //Split out the special characters
    //filter out the empty arrays if any
    //map the trim function to remove extra white spaces    
    var groupProperties = {
      groupName: $(event.target).find('[name=groupName]').val(),
      subgroups: $(event.target).find('[name=subgroups]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),  
      tasks: $(event.target).find('[name=tasks]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      users: $(event.target).find('[name=users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim),
      description: $(event.target).find('[name=description]').val()
    };

    Meteor.call('updateGroup', currentGroupId, groupProperties, function(error) {
      if (error) {
        // display the error to the user
        throwError(error.reason);
      } else {
        //Remove group from DB where appropriate
        Meteor.call('removeAllFromGroups', currentGroupId, function(error, id) {
          if (error) throwError(error.reason);
          else {
            //Add group to DB
            Meteor.call('addToGroups', currentGroupId, function(error, id) {
              if (error) throwError(error.reason);
              else Router.go('groupDisplay', {_id: currentGroupId}); 
            });              
          }
        });   
      }
    });  
 
  },
  
  'click .delete': function(e) {
    e.preventDefault();
    
    if (confirm("Delete this group?")) {
      $("#main-spinner").css('display', 'block');
      var currentGroupId = Session.get('currentGroupId');
      //Remove group from DB
      Meteor.call('removeAllFromGroups', currentGroupId, function(error, id) {
        if (error) throwError(error.reason);
        else {
          Meteor.call('removeGroup', currentGroupId);
          Router.go('groupsList');
        }
      }); 
    }
  }
});
