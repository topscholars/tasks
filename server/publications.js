Meteor.methods({
  notesList: function(ids, options) {
    return isStaff(this.userId) ? Notes.find(ids, options).fetch() : [];
  },

  groupsList: function(ids, options) {
    options.fields = {groupName: 1};
    return isStaff(this.userId) ? Groups.find(ids, options).fetch() : [];
  },

  tasksList: function(ids, options) {
    options.fields = {taskName: 1, type: 1, startTime: 1, endTime: 1, prereqs: 1, visible: 1};
    return isStaff(this.userId) ? Tasks.find(ids, options).fetch() : Tasks.find({users: this.userId, visible: true, status: "active"}, options).fetch();
  },

  schedulesList: function(ids, options) {
    return isStaff(this.userId) ? Schedules.find(ids, options).fetch() : [];
  },

  usersList: function(ids, options) {
    options.fields = {username: 1, firstName: 1, nickName: 1, lastName: 1, type: 1, userTaskStatus: 1, email: 1};
    return isStaff(this.userId) ? Meteor.users.find(ids, options).fetch() : [];
  },

  gmailsList: function(ids, options) {
  //  console.log(ids, options)
    return isStaff(this.userId) ? Gmails.find(ids, options).fetch() : [];
  },

  callsList: function(ids, options) {
    return isStaff(this.userId) ? Calls.find(ids, options).fetch() : [];
  },

  singleGroup: function(id) {
    return isStaff(this.userId) ? Groups.findOne({_id: id}) : null;
  },

  singleTask: function(id) {
    return isStaff(this.userId) ? Tasks.findOne({_id: id}) : Tasks.findOne({_id: id, users: this.userId, visible: true, status: "active"});
  },

  singleUser: function(id) {
    return isStaff(this.userId) ? Meteor.users.findOne({_id: id}, {fields: {services: 0}}) : Meteor.users.findOne({_id: this.userId}, {fields: {services: 0}});
  },

  gChannel: function(id) {
    return GoogleChannels.findOne({userId: id});
  },

  singleMeeting: function(id) {
    if (!this.userId || !id) return [];
    return Meetings.findOne({task: id, attendee: this.userId});
  }
});


//For security reasons, the ids field should be limited by this.userId

Meteor.publish('notesList', function(ids, options) {
  return isStaff(this.userId) ? Notes.find(ids, options) : [];
});

Meteor.publish('groupsList', function(ids, options) {
  return isStaff(this.userId) ? Groups.find(ids, options, {fields: {groupName: 1}}) : [];
});

Meteor.publish('tasksList', function(ids, options) {
  //console.log(ids, options)
  return isStaff(this.userId) ? Tasks.find(ids, options, {fields: {taskName: 1, type: 1, startTime: 1, endTime: 1}}) : Tasks.find({users: this.userId, visible: true, status: "active"}, options, {fields: {taskName: 1, type: 1, startTime: 1, endTime: 1}});
});

Meteor.publish('schedulesList', function(ids, options) {
  return isStaff(this.userId) ? Schedules.find(ids, options) : [];
});

Meteor.publish('usersList', function(ids, options) {
  return isStaff(this.userId) ? Meteor.users.find(ids, options, {fields: {username: 1, firstName: 1, nickName: 1, lastName: 1, type: 1}}) : [];
});

Meteor.publish('gmailsList', function(ids, options) {
//  console.log(ids, options)
  return isStaff(this.userId) ? Gmails.find(ids, options) : [];
});

Meteor.publish('callsList', function(ids, options) {
  return isStaff(this.userId) ? Calls.find(ids, options) : [];
});

Meteor.publish('singleGroup', function(id) {
  return isStaff(this.userId) ? Groups.find({_id: id}) : [];
});

Meteor.publish('singleTask', function(id) {
  return isStaff(this.userId) ? Tasks.find({_id: id}) : Tasks.find({users: this.userId, visible: true, status: "active"});
});

Meteor.publish('singleUser', function(id) {
  return isStaff(this.userId) ? Meteor.users.find({_id: id}, {fields: {services: 0}}) : Meteor.users.find({_id: this.userId}, {fields: {services: 0}});
});

Meteor.publish('gChannel', function(id) {
  return GoogleChannels.find({userId: id});
});

Meteor.publish('singleMeeting', function(id) {
  if (!this.userId || !id) return [];
  return Meetings.find({task: id, attendee: this.userId});
});

Meteor.publish('tasksBulkAdd', function() {
  if (!isStaff(this.userId)) return [];

  //Need to revise how tasks are bulk added so that we don't have to publish everything
  return [
      Tasks.find({}),
      Groups.find({}),
      Meteor.users.find({}, {fields: {services: 0}})
      ];
});

Meteor.publish('groupsBulkAdd', function() {
  if (!isStaff(this.userId)) return [];

  //Need to revise how tasks are bulk added so that we don't have to publish everything
  return [
      Tasks.find({}),
      Groups.find({}),
      Meteor.users.find({}, {fields: {services: 0}}),
      ];
});

Meteor.publish('usersBulkAdd', function() {
  if (!isStaff(this.userId)) return [];

  //Need to revise how tasks are bulk added so that we don't have to publish everything
  return [
      Tasks.find({}),
      Groups.find({}),
      Meteor.users.find({_id: this.userId}, {fields: {services: 0}})
      ];
});
// Meteor.publish('adminList', function() {
//   if (isStaff(this.userId))
//     return [
//             Meteor.users.find({}, {fields: {services: 0}}),
//             Tasks.find({}),
//             Groups.find({}),
//             Schedules.find({})
//           ];
// });


