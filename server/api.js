
/////////////////////////////////////////////
Router.map(function () {
    this.route("/api/users/new", function(){
        console.log('################################################');
        console.log(this.request.method);
        console.log(this.request.headers);

        console.log('------------------------------');
        console.log(JSON.stringify(this.request.body));
        console.log('------------------------------');

        this.response.statusCode = 200;
        this.response.setHeader("Content-Type", "application/json");
        this.response.setHeader("Access-Control-Allow-Origin", "*");
        this.response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        if (this.request.method == 'GET') {
          // LIST
            this.response.end('<html><body>Your request was a ' + this.request.method + '. This API cannot be accessed this way.</body></html>');
        }else if (this.request.method == 'POST') {
          // INSERT
          var user = {
            firstName: this.request.body["firstName"],
            lastName: this.request.body["lastName"],
            nickName: this.request.body["nickName"],     
            birthdate: this.request.body["birthdate"],     
            type: this.request.body["type"], 
            status: "active",  
            users: this.request.body["users"],
            groups: this.request.body["groups"],
            tasks: this.request.body["tasks"],  
            email: this.request.body["email"],
            phone: this.request.body["phone"],
            address1: this.request.body["address1"],
            address2: this.request.body["address2"],
            city: this.request.body["city"],
            state: this.request.body["state"],
            postalCode: this.request.body["postalCode"],
            country: this.request.body["country"]          
          };

          user.username = user.firstName + " " + user.lastName;
          if (user.nickName) user.username = user.firstName + " " + user.nickName + " " + user.lastName;

          //store only the ids, since the objects could potentially be renamed in the future
          if (user.groups)
            user.groups = Groups.find({ groupName: { $in: user.groups.toString().split("@").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });
          else user.groups = [];
          if (user.tasks)
            user.tasks = Tasks.find({ taskName: { $in: user.tasks.toString().split("!").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });
          else user.tasks = [];
          if (user.users)
            user.users = Meteor.users.find({ username: { $in: user.tasks.toString().split("#").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });
          else user.users = [];

          var userId = Meteor.call('userAPI', user, function(error, id) {
            if (error) throw new Meteor.Error(505, error.reason);
            else {
              //Add new users to DB
              Meteor.call('addToUsers', id, function(error, id) {
                if (error) throw new Meteor.Error(505, error.reason);
              });
            }
          });

          this.response.end('<html><body>' + userId + '</body></html>'); 
        }else if (this.request.method == 'OPTIONS') {
          // OPTIONS
          this.response.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, DELETE, OPTIONS");
          this.response.end("OPTIONS Response");
        }
      }, {where: "server"});

    this.route("/users/JSON", function(){
        //Get all users, sort by username
        var data = Meteor.users.find({}, {sort: {username: 1}}).map(function(user){ 
          return {value: user._id, label: user.username + " <" + user.email + ">"}; 
        }); //end map function
        this.response.writeHead(200, {'Content-Type': 'application/json'});
        this.response.end(JSON.stringify(data));
      }, {where: "server"});

    this.route("/groups/JSON", function(){
        //Get all groups, sort by groupName
        var data = Groups.find({}, {sort: {groupName: 1}}).map(function(group){ 
          return {value: group._id, label: group.groupName}; 
        }); //end map function
        this.response.writeHead(200, {'Content-Type': 'application/json'});
        this.response.end(JSON.stringify(data));
      }, {where: "server"});

    this.route("/tasks/JSON", function(){
        //Get all tasks, sort by taskName
        var data = Tasks.find({}, {sort: {taskName: 1}}).map(function(task){ 
          var taskGroup = Groups.findOne({ _id: { $in: task.groups } });
          var groupName = "";
          if (taskGroup) groupName = " @"+taskGroup.groupName;
          return {value: task._id, label: task.taskName + groupName}; 
        }); //end map function
        this.response.writeHead(200, {'Content-Type': 'application/json'});
        this.response.end(JSON.stringify(data));
      }, {where: "server"});

    this.route("/groups/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var groups = Groups.find({});

        csvContent += "\n\ngroupName, subgroups, users, description, tasks";

        groups.forEach(function (thisGroup){ 
          csvContent += "\n"+thisGroup.groupName+",";

          if (thisGroup.subgroups) {
            var subgroups = Groups.find({_id: {$in: thisGroup.subgroups}});
            subgroups.forEach(function (thisSubgroup) {
              csvContent += "@"+thisSubgroup.groupName+" ";
            });
          }

          csvContent += ",";

          if (thisGroup.users) {
            var users = Meteor.users.find({_id: {$in: thisGroup.users}});
            users.forEach(function (thisUser) {
              csvContent += "#"+thisUser.username+" ";
            });
          }

          csvContent += ",";

          csvContent += thisGroup.description + ",";

          if (thisGroup.tasks) {
            var tasks = Tasks.find({_id: {$in: thisGroup.tasks}});
            tasks.forEach(function (thisTask) {
              csvContent += "!"+thisTask.taskName+" ";
            });
          }
        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route("/groups/:_id/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var group = Groups.findOne({_id: this.params._id});

        csvContent += "\n\n" + "Group Name," + group.groupName;

        var groupUsers = Meteor.users.find({ _id: { $in: group.users } }, {sort: {username: 1}});

        csvContent += "\n\n" + "Members";
        groupUsers.forEach(function(user){ 
          csvContent += "\n" + user.username + "," + user.email;
          //console.log(user.username + "," + user.email);
        }); //end forEach

        var groupTasks = Tasks.find({ _id: { $in: group.tasks } }, {sort: {taskName: 1}});

        groupTasks.forEach(function(task){ 
          csvContent += "\n\n" + "Task Name," + task.taskName;
          var taskUsers = Meteor.users.find({ _id: { $in: task.users } }, {sort: {username: 1}});
          
          csvContent += "\n" + "Name,Status,Time Stamp";

          taskUsers.forEach(function(user){
            csvContent += "\n" + user.username + "," + getUserTaskStatus(user._id, task._id); 
          }); //end forEach

        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route("/tasks/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var tasks = Tasks.find({});

        csvContent += "\n\ntaskName, groups, users, type, description, startTime, endTime, prereqs";

        tasks.forEach(function (thisTask){ 
          csvContent += "\n"+thisTask.taskName+",";

          if (thisTask.groups) {
            var groups = Groups.find({_id: {$in: thisTask.groups}});
            groups.forEach(function (thisGroup) {
              csvContent += "@"+thisGroup.groupName+" ";
            });
          }

          csvContent += ",";

          if (thisTask.users) {
            var users = Meteor.users.find({_id: {$in: thisTask.users}});
            users.forEach(function (thisUser) {
              csvContent += "#"+thisUser.username+" ";
            });
          }

          csvContent += ",";

          csvContent += thisTask.type + ",";

          csvContent += thisTask.description + ",";

          csvContent += thisTask.startTime + ",";

          csvContent += thisTask.endTime + ",";

          if (thisTask.prereqs) {
            var prereqs = Tasks.find({_id: {$in: thisTask.prereqs}});
            prereqs.forEach(function (thisPrereq) {
              csvContent += "!"+thisPrereq.taskName+" ";
            });
          }

        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route("/tasks/:_id/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var task = Tasks.findOne({_id: this.params._id});

        csvContent += "\n\n" + "Task Name," + task.taskName;

        var taskUsers = Meteor.users.find({ _id: { $in: task.users } }, {sort: {username: 1}});

        csvContent += "\n" + "Name,Status,Time Stamp";

        taskUsers.forEach(function(user){ 
          csvContent += "\n" + user.username + "," + getUserTaskStatus(user._id, task._id); 
        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route("/users/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var users = Meteor.users.find({});

        csvContent += "\n\nstatus, type, lastName, firstName, email, email2, username, nickName, birthdate, address1, address2, city, state, postalCode, country, mobile";

        users.forEach(function(thisUser){ 
          csvContent += "\n"+thisUser.status+","+thisUser.type+","+thisUser.lastName+","+thisUser.firstName+","+thisUser.email+","+thisUser.email2+","+thisUser.username+","+thisUser.nickName+","+thisUser.birthdate+","+thisUser.address1+","+thisUser.address2+","+thisUser.city+","+thisUser.state+","+thisUser.postalCode+","+thisUser.country+","+thisUser.phone; 
        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route("/users/:_id/report.csv", function(){

        var csvContent = "data:text/csv;charset=utf-8,";

        var user = Meteor.users.findOne({_id: this.params._id});

        csvContent += "\n\n" + "Name," + user.username;

        var userTasks = Tasks.find({ _id: { $in: user.tasks } }, {sort: {taskName: 1}});

        csvContent += "\n" + "Task,Status,Time Stamp";

        userTasks.forEach(function(task){ 
          csvContent += "\n" + task.taskName + "," + getUserTaskStatus(user._id, task._id); 
        }); //end forEach

        this.response.writeHead(200, {'Content-Type': 'text/csv'});
        this.response.end(csvContent); 
      }, {where: "server"});

    this.route('/api/twiml', function(){
        console.log('################################################');
        console.log(this.request.method);
        console.log(this.request.headers);

        console.log('------------------------------');
        console.log(JSON.stringify(this.request.body));
        console.log('------------------------------');

        this.response.statusCode = 200;
        this.response.setHeader("Content-Type", "text/xml");
        this.response.setHeader("Access-Control-Allow-Origin", "*");
        this.response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        if (this.request.method !== 'POST') {
          this.response.end('<html><body>Your request was a ' + this.request.method + '. This API cannot be accessed this way.</body></html>');
        }

        var rawIn = this.request.body;

        var message = {};
        if (rawIn.Body) {
            message.bodyText = rawIn.Body;
            message.source = "SMS";
        } else if (rawIn.TranscriptionText) {
            message.bodyText = rawIn.TranscriptionText;
            message.source = "Voicemail";
        } else {
            return;
        }
        message.from = rawIn.From;

        // var toOrig = rawIn.To;
        // toOrig = toOrig.replace(/\+1/g, "");
        // var toPretty = '('+toOrig.substr(0,3)+') '+toOrig.substr(3,3)+'-'+toOrig.substr(6,10);
        var fromUser = Meteor.users.findOne({phone: message.from});
        var subjectString = message.source + " from " + message.from;
        if (fromUser) subjectString = message.source + " from " + fromUser.username + " <" + message.from + ">"; 

        Email.send({
          from: "incomingSMS@topscholars.org",
          to: "BKK@topscholars.org",
          //bcc: "artitw@gmail.com",
          subject: subjectString,
          text: message.bodyText
        });

        var xml = "<Response><Sms>Your message has been forwarded to staff. Please call the office if urgent.</Sms></Response>";
        this.response.end(xml); 
      }, {where: "server"});

    this.route('/api/twilio/forward', function(){
        console.log('################################################');
        console.log(this.request.method);
        console.log(this.request.headers);

        console.log('------------------------------');
        console.log(JSON.stringify(this.request.body));
        console.log('------------------------------');

        this.response.statusCode = 200;
        this.response.setHeader("Content-Type", "text/xml");
        this.response.setHeader("Access-Control-Allow-Origin", "*");
        this.response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        if (this.request.method !== 'POST') {
          this.response.end('<html><body>Your request was a ' + this.request.method + '. This API cannot be accessed this way.</body></html>');
        }

        var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="+14136233235"><Number>+6621067100</Number></Dial></Response>';
        this.response.end(xml); 

      }, {where: "server"});

    this.route('/calendar/events', function(){
        // console.log('################################################');
        // console.log(this.request.method);
        // console.log(this.request.headers);

        // console.log('------------------------------');
        // console.log(JSON.stringify(this.request.body));
        // console.log('------------------------------');

        this.response.statusCode = 200;
        this.response.setHeader("Content-Type", "application/json");
        this.response.setHeader("Access-Control-Allow-Origin", "*");
        this.response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        if (this.request.method == 'GET') {
          // LIST
            this.response.end('<html><body>Your request was a ' + this.request.method + '. This API cannot be accessed this way.</body></html>');
        } else if (this.request.method == 'POST') {
          var expiration = this.request.headers["x-goog-channel-expiration"];
          var channelId = this.request.headers["x-goog-channel-id"];
          var userId = channelId.split("-GOOGLE-")[0];
          var resourceId = this.request.headers["x-goog-resource-id"];
          var userChannel = GoogleChannels.findOne({userId: userId});
          switch (this.request.headers["x-goog-resource-state"]) {   
            case "exists":
              //First, make sure it is the right channel
              if (!userChannel || userChannel.resourceId !== resourceId || userChannel.channelId !== channelId)
                break;
              Meteor.call('eventsAPI', userId);
              break;
            case "sync":
              //Stop channel if one already exists for the user and make a new channel
              if (userChannel) Meteor.call('stopGoogleChannel', userId);
              GoogleChannels.insert({userId: userId, resourceId: resourceId, channelId: channelId, expiration: expiration});
              var refreshTime = moment().add(24, "hours").format();
              console.log("expiration: " + expiration);
              console.log("refreshTime: " + refreshTime);
              Meteor.call('setGoogleChannelRefresh', userId, refreshTime);
              break;
          }
          this.response.end('<html><body>finished</body></html>'); 
        }else if (this.request.method == 'OPTIONS') {
          // OPTIONS
          this.response.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, DELETE, OPTIONS");
          this.response.end("OPTIONS Response");
        }
      }, {where: "server"});
});

var getUserTaskStatus = function(userId, taskId) {
  var task = Tasks.findOne(taskId);
  var user = Meteor.users.findOne(userId);
  
  var status = "incomplete";
  var timeStamp;
  if (user.userTaskStatus) {
    for (var i=0; i<user.userTaskStatus.length; i++) {
      if (user.userTaskStatus[i].taskId === taskId) {
        status = user.userTaskStatus[i].status;
        timeStamp = user.userTaskStatus[i].timeStamp;
        break;
      }
    }
  }
  return status+','+jsUTCtoLocalTime(timeStamp);
};
