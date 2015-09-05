//Users = Meteor.users; //unecessary if we use the collection directly
Gmails = new Mongo.Collection('gmails');
Calls = new Mongo.Collection('calls');
Notes = new Mongo.Collection('notes');
GoogleChannels = new Mongo.Collection('googleChannels');
Meetings = new Mongo.Collection('meetings');

Notes.allow({
  insert: isStaff,
  update: isStaff,
  remove: isStaff
});

Calls.allow({
  update: isStaff 
});

Meteor.users.allow({
  insert: isStaff,
  update: isStaff,
  remove: isStaff
});

Meteor.users.allow({
  update: isUser 
});

Meteor.users.deny({
  remove: function(userId, doc) {
    var user = Meteor.users.findOne(userId);

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(402, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(403, "You need to verify your email");

  },

  update: function(userId, doc, fieldNames, modifier) {

    var user = Meteor.users.findOne(userId);

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(401, "You need to verify your email");

    if (!modifier.$set.firstName && !modifier.$set.lastName)
      throw new Meteor.Error(422, "Name fields cannot be blank.");
    
    if (!emailIsValid(modifier.$set.email))
      throw new Meteor.Error(401, "Please enter a valid email.");

    if (!userIsUnique(doc, modifier.$set.username))
      throw new Meteor.Error(401, "Name cannot blank or already be in use.");

    if (!emailIsUnique(doc, modifier.$set.email))
      throw new Meteor.Error(401, "Email already in use.");

    if (!phoneIsUnique(doc, modifier.$set.phone))
      throw new Meteor.Error(401, "Phone already in use.");

    if (user.type==='admin') {
      // ensure the user has a type
      if (!modifier.$set.type)
        throw new Meteor.Error(422, 'Please fill in a valid type');

      // ensure the user has a status
      if (!modifier.$set.status)
        throw new Meteor.Error(422, 'Please fill in a valid status');      
    }

    // if (Meteor.isServer) {
    //   var groupIds = modifier.$set.groups;
    //   if(groupIds){
    //     for(var i = 0; i < groupIds.length; i++){
    //       //ensure that the task exists
    //       var thisGroup = Groups.findOne(groupIds[i]);
    //       if (!thisGroup)
    //         throw new Meteor.Error(401, "Could not find group with id \""+groupIds[i]+"\".");
    //     }
    //   }

    //   var taskIds = modifier.$set.tasks;
    //   if(taskIds){
    //     for(var i = 0; i < taskIds.length; i++){
    //       //ensure that the task exists
    //       var thisTask = Tasks.findOne(taskIds[i]);
    //       if (!thisTask)
    //         throw new Meteor.Error(401, "Could not find task with id \""+taskIds[i]+"\".");
    //     }
    //   }
    // }//end if (Meteor.isServer)
    
    if (isStaff(userId))  // Staff may edit all fields
      return (_.without(fieldNames, 'firstName', 'nickName', 'lastName', 'username', 'type', 'users', 'status', 'groups', 'tasks', 'rsvps', 'email', 'email2', 'phone', 'birthdate', 'address1', 'address2', 'city', 'state', 'postalCode', 'country').length > 0);
    if (isUser(userId, doc))  // Editor may only edit the following fields:
      return (_.without(fieldNames, 'firstName', 'nickName', 'lastName', 'username', 'email', 'email2', 'phone', 'birthdate', 'address1', 'address2', 'city', 'state', 'postalCode', 'country').length > 0);
    return true;  // All others are not allowed to edit
  }
});

Meteor.methods({
  updateUserNote: function(noteId, text) {
    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(402, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(403, "You need to verify your email");

    var note = Notes.findOne(noteId);

    //ensure user owns the note
    if (note.authorId !== user._id)
      throw new Meteor.Error(403, "You can only edit notes that you created");

    var noteUpdates = {
      text: text,
      author: user.username,
      submitted: new Date().getTime()
    };
    
    Notes.update(noteId, {$set: noteUpdates});
  },

  addUserNote: function(noteAttributes, userId) {
    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(402, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(403, "You need to verify your email");

    var thisUser = Meteor.users.findOne(userId);
    // pick out the whitelisted keys
    var newNote = _.extend(_.pick(noteAttributes, 'text', 'callId'), {
      userId: userId,
      username: thisUser.username,
      authorId: user._id,
      author: user.username,
      submitted: new Date().getTime()
    });
    
    var noteId = Notes.insert(newNote);
    
    return noteId;
  },

  user: function(userAttributes) {
    var user = Meteor.user();

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to sign in");

    // ensure the user is staff
    if (!isStaff(user._id))
      throw new Meteor.Error(402, "You need to be staff");

    //ensure the user has verified email
    if (!user.emails[0].verified)
      throw new Meteor.Error(403, "You need to verify your email");

    if (!userAttributes.firstName && !userAttributes.lastName)
      throw new Meteor.Error(404, "Name fields cannot be blank.");
    
    if (!emailIsValid(userAttributes.email))
      throw new Meteor.Error(405, "Please enter a valid email.");

    if (!userIsUnique("", userAttributes.username))
      throw new Meteor.Error(406, "Name cannot blank or already be in use.");

    if (!emailIsUnique([], userAttributes.email))
      throw new Meteor.Error(407, "Email already in use.");
    
    if (!phoneIsUnique([], userAttributes.phone))
      throw new Meteor.Error(401, "Phone already in use.");

    // ensure the user has a type
    if (!userAttributes.type)
      throw new Meteor.Error(408, 'Please fill in a valid type');

    // ensure the user has a status
    if (!userAttributes.status)
      throw new Meteor.Error(409, 'Please fill in a valid status');

    // if (Meteor.isServer) {
    //   var groupIds = userAttributes.groups;
    //   if(groupIds){
    //     for(var i = 0; i < groupIds.length; i++){
    //       //ensure that the task exists
    //       var thisGroup = Groups.findOne(groupIds[i]);
    //       if (!thisGroup)
    //         throw new Meteor.Error(410, "Could not find group with id \""+groupIds[i]+"\".");
    //     }
    //   }

    //   var taskIds = userAttributes.tasks;
    //   if(taskIds){
    //     for(var i = 0; i < taskIds.length; i++){
    //       //ensure that the task exists
    //       var thisTask = Tasks.findOne(taskIds[i]);
    //       if (!thisTask)
    //         throw new Meteor.Error(412, "Could not find task with id \""+taskIds[i]+"\".");
    //     }
    //   }
    // }//end if (Meteor.isServer)
    // pick out the whitelisted keys
    var newUser = _.extend(_.pick(userAttributes, 'firstName', 'nickName', 'lastName', 'username', 'type', 'users', 'status', 'groups', 'tasks', 'rsvps', 'email', 'email2', 'phone', 'birthdate', 'address1', 'address2', 'city', 'state', 'postalCode', 'country'), {
      emails: [{"address": userAttributes.email, "verified": false}],
      userId: user._id, 
      author: user.username, 
      submitted: new Date().getTime()
    });
    
    var userId = Meteor.users.insert(newUser);
    
    return userId;
  }
  
});

// on Client and Server
EasySearch.createSearchIndex('users', {
  'collection': Meteor.users, // instanceof Meteor.Collection
  'field': ['username', 'email', 'email2', 'phone', 'status', 'type', 'birthdate', 'address1', 'address2', 'city', 'state', 'postalCode', 'country'], // array of fields to be searchable
  'limit': 10,
  'use' : 'mongo-db',
  'convertNumbers': false,
  'props': {
    'filteredCategory': 'All'
  },
  'sort': function() {
    return { 'username': 1 };
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

// on Client and Server
EasySearch.createSearchIndex('notes', {
  'collection': Notes, // instanceof Meteor.Collection
  'field': ['username', 'author', 'text'], // array of fields to be searchable
  'limit': 10,
  'use' : 'mongo-db',
  'convertNumbers': false,
  'props': {
    'filteredCategory': 'All'
  },
  'sort': function() {
    return { 'username': 1 };
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

