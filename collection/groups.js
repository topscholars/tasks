Groups = new Mongo.Collection('groups');

Groups.allow({
  insert: isStaff,
  update: isStaff,
  remove: isStaff
});

Groups.deny({
  remove: function(userId, doc) {
    var user = Meteor.users.findOne(userId);

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(401, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

  },
  
});

Meteor.methods({
  addGroup: function(groupAttributes) {
    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(401, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    // ensure the group has a name
    if (!groupAttributes.groupName)
      throw new Meteor.Error(422, 'Please fill in a Group name');
    
    if (Meteor.isServer) {
      var groupWithSameName = Groups.findOne({groupName: groupAttributes.groupName});
     // check that there are no previous groups with the same name
      if (groupAttributes.groupName && groupWithSameName) {
        throw new Meteor.Error(302, 
          'This group has already been created', 
          groupWithSameName._id);
      }

      var subgroupsCount = groupAttributes.subgroups.length;
      var tasksCount = groupAttributes.tasks.length;
      var usersCount = groupAttributes.users.length;

      //store only the ids, since the objects could potentially be renamed in the future
      groupAttributes.subgroups = Groups.find({ _id: { $in: groupAttributes.subgroups } }).map(function(item){ return item._id; });
      groupAttributes.tasks = Tasks.find({ _id: { $in: groupAttributes.tasks } }).map(function(item){ return item._id; });
      groupAttributes.users = Meteor.users.find({ _id: { $in: groupAttributes.users } }).map(function(item){ return item._id; });
      
      if (subgroupsCount > groupAttributes.subgroups.length)
        throw new Meteor.Error(422, "Warning: At least one of the subgroups is invalid and has been ignored.");
      if (tasksCount > groupAttributes.tasks.length)
        throw new Meteor.Error(422, "Warning: At least one of the tasks is invalid and has been ignored.");
      if (usersCount > groupAttributes.users.length)
        throw new Meteor.Error(422, "Warning: At least one of the users is invalid and has been ignored.");
    }//end if (Meteor.isServer)

    // pick out the whitelisted keys
    var group = _.extend(_.pick(groupAttributes, 'groupName', 'subgroups', 'tasks', 'users', 'description'), {
      userId: user._id, 
      author: user.username, 
      submitted: new Date().getTime(),
    });
    
    var groupId = Groups.insert(group);
    
    return groupId;
  },

  updateGroup: function(groupId, modifier) {
    var user = Meteor.users.findOne(this.userId);
    var group = Groups.findOne(groupId);

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(401, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    // ensure the group has a name
    if (!modifier.groupName)
      throw new Meteor.Error(422, 'Please fill in a Group name');

    var groupName = modifier.groupName;
    var groupWithSameName = Groups.findOne({_id: {$ne: groupId}, groupName: groupName});
   // check that there are no previous groups with the same name
    if (groupName && groupWithSameName) {
      throw new Meteor.Error(302, 
        groupName + ' has already been created', 
        groupId);
    }

    var subgroups = modifier.subgroups;
    if(subgroups){
      for(var i = 0; i < subgroups.length; i++){
        //ensure that the subgroup exists
        var thisSubgroup = Groups.findOne(subgroups[i]);
        if (!thisSubgroup)
          throw new Meteor.Error(401, "Could not find group with id \""+subgroups[i]+"\"");

        //Ensure that this subgroup is not already a supergroup up the chain, i.e. recursion
        if (groupId === thisSubgroup._id)
          throw new Meteor.Error(401, "@"+modifier.groupName+" is the current group name and cannot be added as a subgroup."); 

        //Ensure that this subgroup is not already a supergroup up the chain, i.e. recursion
        if (isSupergroup(group, thisSubgroup)) {
          var superGroup = Groups.findOne(subgroups[i]);
          throw new Meteor.Error(401, "@"+superGroup.groupName+" is already a super group and cannot be added as a subgroup.");
        }
      }
    }

    var taskIds = modifier.tasks;
    if(taskIds){
      for(var i = 0; i < taskIds.length; i++){
        //ensure that the task exists
        var thisTask = Tasks.findOne(taskIds[i]);
        if (!thisTask)
          throw new Meteor.Error(401, "Could not find task with id \""+taskIds[i]+"\".");
      }
    }

    var userIds = modifier.users;
    if(userIds){
      for(var i = 0; i < userIds.length; i++){
        //ensure that the user account exists
        var thisUser = Meteor.users.findOne(userIds[i]);
        if (!thisUser)
          throw new Meteor.Error(401, "Warning: Could not find user with id \""+userIds[i]+"\".");
      }
    }
    Groups.update(groupId, {$set: modifier});
  }
});

// Global function
//Check if subgroup (2nd arguement) and its supergroups are a super group of group (1st argument)
isSupergroup = function(group, subgroup) {
  var supergroups = Groups.find({subgroups: subgroup._id});
  if (subgroup.subgroups.indexOf(group._id) > -1)
    return true;
  else if (!supergroups) //exhaustively check until no supergroups
    return false;
  else {
    //check all subgroup's supergroups to make sure they are not supergroups of group    
    for(var i=0; i<supergroups.length; i++)
      return isSupergroup(group, supergroups[i]);
  }

};


// on Client and Server
EasySearch.createSearchIndex('groups', {
  'collection': Groups, // instanceof Meteor.Collection
  'field': ['groupName', 'description'], // array of fields to be searchable
  'limit': 10,
  'use' : 'mongo-db',
  'convertNumbers': false,
  'props': {
    'filteredCategory': 'All'
  },
  'sort': function() {
    return { 'groupName': 1 };
  },
  'query': function(searchString) {
    // Default query that will be used for the mongo-db selector
    var query = EasySearch.getSearcher(this.use).defaultQuery(this, searchString);

    // filter for categories if set
    if (this.props.filteredCategory.toLowerCase() !== 'all') {
      query.category = this.props.filteredCategory;
    }

    return query;
  }
});
