Template.userEdit.onCreated(function () {
  var instance = this;
  instance.autorun(function () {
    var subscription = instance.subscribe('singleUser', Session.get('currentUserId'));
    if (subscription.ready()) {
      Tracker.afterFlush(function() {
        instance.subscribe('gChannel', Session.get('currentUserId'));

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

        var thisUser = Meteor.users.findOne(Session.get('currentUserId'));
        if (thisUser.tasks) {
          instance.subscribe('tasksList', { _id: { $in: thisUser.tasks } }, {sort: [["taskName","asc"]]}, function () {
            var userTasks = Tasks.find({ _id: { $in: thisUser.tasks } });
            var userTaskGroups = userTasks.map(function (thisTask) {
              return thisTask.groups ? thisTask.groups[0] : "";
            });            
            instance.subscribe('groupsList', { _id: { $in: userTaskGroups } }, {sort: [["groupName","asc"]]}, function () {
              var tokens = userTasks.map(function(item){ 
                var itemGroup = Groups.findOne({ _id: { $in: item.groups } });
                var groupName = "";
                if (itemGroup) groupName = " @"+itemGroup.groupName;
                return {value: item._id, label: item.taskName + groupName}; 
              });
              $('#tokenfield-typeahead-tasks').tokenfield('setTokens', tokens);     
            });    
          });
        }

        if (thisUser.groups) {
          instance.subscribe('groupsList', { _id: { $in: thisUser.groups } }, {sort: [["groupName","asc"]]}, function () {
            var userGroups = Groups.find({ _id: { $in: thisUser.groups } });
            var tokens = userGroups.map(function(item){ return {value: item._id, label: item.groupName}; });
            $('#tokenfield-typeahead-groups').tokenfield('setTokens', tokens);         
          });
        }

        if (thisUser.users) {
          instance.subscribe('usersList', { _id: { $in: thisUser.users } }, {sort: [["username","asc"]]}, function () {
            var users = Meteor.users.find({ _id: { $in: thisUser.users } });
            var tokens = users.map(function(item){ return {value: item._id, label: item.username + " <" + item.email + ">"}; });
            $('#tokenfield-typeahead-users').tokenfield('setTokens', tokens);      
          });
        }
      });
    }
  });
});

Template.userEdit.helpers({
  user: function() {
    return Meteor.users.findOne(Session.get('currentUserId'));
  },
  showSyncButton: function() {
    return !GoogleChannels.findOne({userId: Session.get('currentUserId')});
  }
});

Template.userEdit.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
    var currentUserId = Session.get('currentUserId');
    var currentUser = Meteor.users.findOne(Session.get('currentUserId'));

    if (Meteor.user().type==="staff" || Meteor.user().type==="admin") {
      //Split out the special characters
      //filter out the empty arrays if any
      //map the trim function to remove extra white spaces    
      var userProperties = {
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
  
      userProperties.username = userProperties.firstName + " " + userProperties.lastName;
      if (userProperties.nickName) userProperties.username = userProperties.firstName + " " + userProperties.nickName + " " + userProperties.lastName;

      Meteor.users.update(currentUserId, {$set: userProperties}, function(error) {
        if (error) {
          // display the error to the user
          throwError(error.reason);
        } else {

          //Remove user from DB where appropriate
          Meteor.call('removeAllFromUsers', currentUserId, function(error, id) {
            if (error) throwError(error.reason);
            else {
              //Add user to DB
              Meteor.call('addToUsers', currentUserId, function(error, id) {
                if (error) throwError(error.reason);
              });              
            } 
          });
  
          if (currentUser.email !== userProperties.email && confirm("Email has changed. Send new verification link? (Cancel to continue without sending)")) {
            //Update email
            Meteor.call('updateEmail', currentUserId, function(error, id) {
              if (error) throwError(error.reason);
              else Router.go('userDisplay', {_id: currentUserId});
            });            
          }
          else Router.go('userDisplay', {_id: currentUserId});
        }
      });  
    }   //end if isStaff 
    else if (isUser(Meteor.userId()), currentUser) {
      var userProperties = {
        firstName: $(event.target).find('[name=firstName]').val(),
        lastName: $(event.target).find('[name=lastName]').val(),
        nickName: $(event.target).find('[name=nickName]').val(),
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

      userProperties.username = userProperties.firstName + " " + userProperties.lastName;
      if (userProperties.nickName) userProperties.username = userProperties.firstName + " " + userProperties.nickName + " " + userProperties.lastName;

      Meteor.users.update(currentUserId, {$set: userProperties}, function(error) {
        if (error) {
          // display the error to the user
          throwError(error.reason);
        } else {
  
          if (currentUser.email !== userProperties.email && confirm("Email has changed. Send new verification link? (Cancel to continue without sending)")) {
            //Update email
            Meteor.call('updateEmail', currentUserId, function(error, id) {
              if (error) throwError(error.reason);
              else Router.go('userDisplay', {_id: currentUserId});
            });            
          }
          else Router.go('userDisplay', {_id: currentUserId});
        }
      });  
    }   //end if isStaff 
  },
  
  'click .delete': function(e) {
    e.preventDefault();

    if (confirm("Delete this user?")) {
      $("#main-spinner").css('display', 'block');

      var currentUserId = Session.get('currentUserId');
      var currentUser = Meteor.users.findOne(currentUserId);
       //Remove user from DB
      Meteor.call('removeAllFromUsers', currentUserId, function(error, id) {
        if (error) throwError(error.reason);
        else {
          Meteor.users.remove(currentUserId);        
          Router.go('usersList');
        }
      });     
    }
  },
  
  'click #sendVerificationEmail': function(e) {
    e.preventDefault();
    
    if (confirm("Email new verification link?")) {
      var currentUserId = Session.get('currentUserId');
      //Update email
      Meteor.call('updateEmail', currentUserId, function(error, id) {
        if (error) throwError(error.reason);
      });        
    }
  },
  
  'click #enableGCalPush': function(e) {
    e.preventDefault();
    
    if (confirm("Enable Google Calender <-> TS?")) {
      $('#enableGCalPush').text("Enabling...");
      var currentUserId = Session.get('currentUserId');
      Meteor.call('exchangeRefreshToken', currentUserId, function (error, result) {
        if (!error) {
          Meteor.call('eventWatch', currentUserId, function (error, result) {
            if (error) throwError(error.reason);
          });
        } else throwError(error.reason); 
      });
    }
  },
  
  'click #disableGCalPush': function(e) {
    e.preventDefault();
    
    if (confirm("Pause Google Calender <-> TS?")) {
      $('#disableGCalPush').text("Pausing...");
      var currentUserId = Session.get('currentUserId');
      Meteor.call('exchangeRefreshToken', currentUserId, function (error, result) {
        if (!error) {
          Meteor.call('stopGoogleChannel', currentUserId, function (error, result) {
            if (error) throwError(error.reason);
          });
        } else throwError(error.reason); 
      });
    }
  }
});
