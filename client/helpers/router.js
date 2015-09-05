Router.configure({
  layoutTemplate: 'mainLayout',
  loadingTemplate: 'loading',
  waitOn: function() {
    if (Meteor.userId()) return [Meteor.subscribe('singleUser', Meteor.userId())];
  },
  onAfterAction: function() { 
    $("#main-spinner").css('display', 'none');

  // var user = Meteor.user();
  // if (user && $('#userEditDropdown').length===0) {
  //   var userEditHTML = "<a href='/users/"+user._id+"/edit' class='btn btn-default btn-block' id='userEditDropdown'><span class='glyphicon glyphicon-cog' aria-hidden='true'></span> My Account</a>";
  //   $('#login-buttons-open-change-password').before(userEditHTML);
  // }

    Session.setDefault("closable", false);
    if (Meteor.user() && $('#login-buttons-my-account').length===0) {
      var loginButtonsMyAccount = "<div class='login-button' id='login-buttons-my-account'>&#9788; My Account</div>";
      $('#login-buttons-open-change-password').before(loginButtonsMyAccount);
    }
  }
});

Router.route('/calendar', {
  name: 'calendar', 
  waitOn: function () {
    dashboardSettings(Meteor.userId());
  },
  data: function() { 
    return Meteor.user();
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('calendar');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/', {
  name: 'home', 
  action: function () {
    this.render('home');
  }
});

Router.route('/signin', {
  name: 'accessDenied',
  action: function () {
    this.render('accessDenied');
  }
});

Router.route('/search', {
  name: 'search', 
  action: function () {
    this.render('search');
  }
});

Router.route('/notes/search', {
  name: 'noteSearch', 
  waitOn: function () {
    resetViewTabs();
  },
  action: function () {
    this.render('noteSearch');
  }
});

Router.route('/tasks/search', {
  name: 'taskSearch', 
  waitOn: function () {
    resetViewTabs();
  },
  action: function () {
    this.render('taskSearch');
  }
});

Router.route('/users/search', {
  name: 'userSearch', 
  waitOn: function () {
    resetViewTabs();
  },
  action: function () {
    this.render('userSearch');
  }
});

Router.route('/groups/search', {
  name: 'groupSearch', 
  waitOn: function () {
    resetViewTabs();
  },
  action: function () {
    this.render('groupSearch');
  }
});

Router.route('/notes/new', {
  name: 'noteNew', 
  action: function () {
    this.render('noteNew');
  }
});

Router.route('/tasks/new', {
  name: 'taskNew', 
  action: function () {
    this.render('taskNew');
  }
});

Router.route('/users/new', {
  name: 'userNew', 
  action: function () {
    this.render('userNew');
  }
});

Router.route('/groups/new', {
  name: 'groupNew', 
  action: function () {
    this.render('groupNew');
  }
});

Router.route('/tasks/newbulk', {
  name: 'taskNewBulk', 
  waitOn: function () {
    return Meteor.subscribe('tasksBulkAdd');
  },
  action: function () {
    this.render('taskNewBulk');
  }
});

Router.route('/users/newbulk', {
  name: 'userNewBulk', 
  waitOn: function () {
    return Meteor.subscribe('usersBulkAdd');
  },
  action: function () {
    this.render('userNewBulk');
  }
});

Router.route('/groups/newbulk', {
  name: 'groupNewBulk', 
  waitOn: function () {
    return Meteor.subscribe('groupsBulkAdd');
  },
  action: function () {
    this.render('groupNewBulk');
  }
});

Router.route('/tasks/schedule', {
  name: 'taskSchedule',

  waitOn: function () {
    resetViewTabs();
  },

  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('taskSchedule');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/notes', {
  name: 'notesList',
  
  waitOn: function () {
    resetViewTabs();
  },

  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('notesList');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/tasks', {
  name: 'tasksList',
  
  waitOn: function () {
    resetViewTabs();
  },

  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('tasksList');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/users', {
  name: 'usersList',
  
  waitOn: function () {
    resetViewTabs();
  },

  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('usersList');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/groups', {
  name: 'groupsList',
  
  waitOn: function () {
    resetViewTabs();
  },

  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('groupsList');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/tasks/:_id', {
  name: 'taskDisplay',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/tasks/"+this.params._id.replace("_es", ""));
    taskDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('taskDisplay');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/users/:_id', {
  name: 'userDisplay',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/users/"+this.params._id.replace("_es", ""));
    userDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('userDisplay');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/groups/:_id', {
  name: 'groupDisplay',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/groups/"+this.params._id.replace("_es", ""));
    groupDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('groupDisplay');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/tasks/:_id/edit', {
  name: 'taskEdit',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/tasks/"+this.params._id.replace("_es", "")+"/edit");
    taskDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('taskEdit');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});
Router.route('/users/:_id/edit', {
  name: 'userEdit',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/users/"+this.params._id.replace("_es", "")+"/edit");
    userDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('userEdit');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/groups/:_id/edit', {
  name: 'groupEdit',
  
  waitOn: function () {
    if (this.params._id.indexOf("_es") === this.params._id.length-3)
      Router.go("/groups/"+this.params._id.replace("_es", "")+"/edit");
    groupDisplaySettings(this.params._id);
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('groupEdit');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

Router.route('/dashboard', {
  name: 'dashboard',
  
  waitOn: function () {
    dashboardSettings(Meteor.userId());
  },
  data: function() { 
    return Meteor.user();
  },
  action: function () {
    if (this.ready())
      // if the sub handle returned from waitOn ready() method returns
      // true then we're ready to go ahead and render the page.
      this.render('dashboard');
    else
      // otherwise render the loading template.
      this.render(this.loadingTemplate);
  }
});

var requireLogin = function() {
  if (!Meteor.user() || Meteor.user().status==="inactive") {
    if (Meteor.loggingIn()) {
      this.render(this.loadingTemplate);
    } else {
      throwError("Please register and log in.");
      this.render('accessDenied');
    }
  } 
  else if (!Meteor.user().emails[0].verified) {
    throwError("Before continuing, please click on the verification link emailed to you.");
    this.render('accessDenied');
  }   
  else {
    this.next();
  }
};

// Only staff can view certain pages
var nonStaffFilter = function() {
  if (Meteor.user().type!=="staff" && Meteor.user().type!=="admin"){
    console.log("Page restricted to staff only.");
    console.log("USER: " + JSON.stringify(Meteor.user()));
    //throwError("Page restricted to staff only.");
    Router.go("dashboard");
  }
  else
    this.next();
};

var userPrelim = function() {
  var user = Meteor.user();
  if (user && (Meteor.user().type!=="staff" && Meteor.user().type!=="admin") && (!user.firstName || !user.lastName || !user.phone || !user.birthdate || !user.address1 || !user.city || !user.state || !user.postalCode || !user.country)) {
    throwError("Please fill in all of your information below before continuing. Your nickname is optional.");
    Router.go("/users/"+user._id+"/edit");
  } else this.next();
};

var taskDisplaySettings = function(taskId) {
  Session.set('currentTaskId', taskId); //set id for later use
  if (Session.get("viewGroupsByTask")) {
    Session.set("viewGroupsByTask", taskId);
    return;
  }
  if (Session.get("viewUsersByTask")) {
    Session.set("viewUsersByTask", taskId);
    return;
  }
  if (Session.get("addUserToTask")) {
    Session.set("addUserToTask", taskId);
    return;
  }
  if (Session.get("addUserToTask")) {
    Session.set("addUserToTask", taskId);
    return;
  }
  resetViewTabs();
  Session.set('currentTaskId', taskId);
  Session.set("viewGroupsByTask", taskId);
};

var dashboardSettings = function(userId) {
  Session.set('currentUserId', userId); //set id for later use
  if (Session.get("viewCalendarByUser")) {
    Session.set("viewCalendarByUser", userId);
    return;
  }
  if (Session.get("viewGroupsByUser")) {
    Session.set("viewGroupsByUser", userId);
    return;
  }
  if (Session.get("viewTasksByUser")) {
    Session.set("viewTasksByUser", userId);
    return;
  }
  if (Session.get("addGroupToUser")) {
    Session.set("addGroupToUser", userId);
    return;
  }
  if (Session.get("addTaskToUser")) {
    Session.set("addTaskToUser", userId);
    return;
  }
  resetViewTabs();
  Session.set('currentUserId', userId);
  Session.set("viewTasksByUser", userId);
};

var userDisplaySettings = function(userId) {
  Session.set('currentUserId', userId); //set id for later use
  if (Session.get("viewNotesByUser")) {
    Session.set("viewNotesByUser", userId);
    return;
  }
  if (Session.get("viewCallsByUser")) {
    Session.set("viewCallsByUser", userId);
    return;
  }
  if (Session.get("viewEmailsByUser")) {
    Session.set("viewEmailsByUser", userId);
    return;
  }
  if (Session.get("viewGroupsByUser")) {
    Session.set("viewGroupsByUser", userId);
    return;
  }
  if (Session.get("viewUsersByUser")) {
    Session.set("viewUsersByUser", userId);
    return;
  }
  if (Session.get("viewTasksByUser")) {
    Session.set("viewTasksByUser", userId);
    return;
  }
  if (Session.get("addGroupToUser")) {
    Session.set("addGroupToUser", userId);
    return;
  }
  if (Session.get("addTaskToUser")) {
    Session.set("addTaskToUser", userId);
    return;
  }
  resetViewTabs();
  Session.set('currentUserId', userId);
  Session.set("viewTasksByUser", userId);
};

var groupDisplaySettings = function(groupId) {
  Session.set('currentGroupId', groupId); //set id for later use
  if (Session.get("viewGroupsByGroup")) {
    Session.set("viewGroupsByGroup", groupId);
    return;
  }
  if (Session.get("viewTasksByGroup")) {
    Session.set("viewTasksByGroup", groupId);
    return;
  }
  if (Session.get("viewUsersByGroup")) {
    Session.set("viewUsersByGroup", groupId);
    return;
  }
  if (Session.get("viewGroupsByGroup")) {
    Session.set("viewGroupsByGroup", groupId);
    return;
  }
  if (Session.get("addUserToGroup")) {
    Session.set("addUserToGroup", groupId);
    return;
  }
  if (Session.get("addSubgroupToGroup")) {
    Session.set("addSubgroupToGroup", groupId);
    return;
  }
  if (Session.get("addTaskToGroup")) {
    Session.set("addTaskToGroup", groupId);
    return;
  }
  resetViewTabs();
  Session.set('currentGroupId', groupId);
  Session.set("viewUsersByGroup", groupId);
};


var resetViewTabs = function() {
  Session.set("viewGroupsByTask", false);
  Session.set("viewUsersByTask", false);
  Session.set("addUserToTask", false);
  Session.set("addGroupToTask", false);
  Session.set("viewCalendarByUser", false);
  Session.set("viewEmailsByUser", false);
  Session.set("viewCallsByUser", false);
  Session.set("viewNotesByUser", false);
  Session.set("viewGroupsByUser", false);
  Session.set("viewUsersByUser", false);
  Session.set("viewTasksByUser", false);
  Session.set("addGroupToUser", false);
  Session.set("addTaskToUser", false);
  Session.set("viewGroupsByGroup", false);
  Session.set("viewTasksByGroup", false);
  Session.set("viewUsersByGroup", false);
  Session.set("addUserToGroup", false);
  Session.set("addSubgroupToGroup", false);
  Session.set("addTaskToGroup", false);
};

Router.onBeforeAction('loading');
Router.onBeforeAction(function() { removeSeenErrors(); this.next(); });
Router.onBeforeAction(requireLogin, {except: ['accessDenied']});
Router.onBeforeAction(nonStaffFilter, {except: ['dashboard', 'calendar', 'accessDenied', 'userEdit', 'taskDisplay']});
Router.onBeforeAction(userPrelim, {except: ['accessDenied', 'userEdit']});

