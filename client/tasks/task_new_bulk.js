var inputData;

Template.taskNewBulk.rendered = function() {

  var $container = $("#handsOnTable");
  $container.handsontable({
    data: [],
    dataSchema: {taskName: null, taskMaster: null, type: null, startTime: null, endTime: null, location: null, status: null, groups: null, users: null, description: null, emailBody: null, emailTime: null, sms: null, smsTime: null, visible: null, emailSMS: null, googleCalendar: null},
    startRows: 5,
    startCols: 4,
    colHeaders: ['Task Name', 'Task Master', 'Type', 'Start Time', 'End Time', 'Location', 'Status', 'Groups', 'Users', 'Description', 'Email', 'Email Time', 'SMS', 'SMS Time', 'Visible?', 'Emails/SMS?', 'Google Calendar?'],
    columns: [
      {data: "taskName"},
      {data: "taskMaster"},
      {data: "type"},
      {data: "startTime"},
      {data: "endTime"},
      {data: "location"},
      {data: "status"},
      {data: "groups"},
      {data: "users"},
      {data: "description"},         
      {data: "emailBody"},
      {data: "emailTime"},
      {data: "sms"},
      {data: "smsTime"},
      {data: "visible"},
      {data: "emailSMS"},
      {data: "googleCalendar"}
    ],
    minSpareRows: 25
  });

  $container.handsontable('render'); //refresh the grid to display the new value
  inputData = $container.data('handsontable').getData();
};

Template.taskNewBulk.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var lastMasterId = "";    

    for (row in inputData) {
      console.log("INPUT DATA: " + JSON.stringify(inputData[row]));

      if (!inputData[row].taskName) break;
      //Split out the special characters
      //filter out the empty arrays if any
      //map the trim function to remove extra white spaces   
      var task = {
        taskName: inputData[row].taskName,
        taskMaster: inputData[row].taskMaster,        
        type: inputData[row].type,
        startTime: getUTCString(inputData[row].startTime),   
        endTime: getUTCString(inputData[row].endTime), 
        location: inputData[row].location,     
        status: inputData[row].status,      
        groups: inputData[row].groups,  
        users: inputData[row].users,
        //emailList: $(event.target).find('[name=emailList]').val(),
        //emailCampaign: $(event.target).find('[name=emailCampaign]').val(),
        description: inputData[row].description,
        emailBody: inputData[row].emailBody,
        emailTime: getUTCString(inputData[row].emailTime),   
        sms: inputData[row].sms,
        smsTime: getUTCString(inputData[row].smsTime),
        visible: false,
        emailSMS: false,
        googleCalendar: false
      };

      if (task.emailBody) task.emailBody = task.emailBody.replace( /\\r?\\n/g, "\r\n" ).replace( /\\t/g, "\t" );

      //store only the ids, since the objects could potentially be renamed in the future
      if (task.groups)
        task.groups = Groups.find({ groupName: { $in: task.groups.toString().split("@").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });       
      else task.groups = [];
      if (task.users)
        task.users = Meteor.users.find({ username: { $in: task.users.toString().split("#").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });        
      else task.users = [];

      var taskMasterName = task.taskMaster.toString().split("#").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0];

      if (!Meteor.users.findOne({ username: taskMasterName })) 
        throwError("Please specify a valid task master."); 

      task.taskMaster = Meteor.users.findOne({ username: taskMasterName })._id;

      if (inputData[row].visible==="true") task.visible = true;
      if (inputData[row].emailSMS==="true") task.emailSMS = true;
      if (inputData[row].googleCalendar==="true") task.googleCalendar = true;

      if (lastMasterId===task.taskMaster) { //no need to refresh token again
        Meteor.call('task', task, function (error, id) {
          if (!error) {
            Meteor.call('addToTasks', id, function (error, result) {
              if (!error) {
                if (task.googleCalendar)
                  Meteor.call('insertGoogleEvent', id, function (error, result) {
                    if (!error) console.log(task.taskName + " added successfully");
                    else throwError(error.reason);
                  });//end Meteor.call('addToTasks'
              } else throwError(error.reason);
            });//end Meteor.call('addToTasks'
          } else throwError(error.reason);
        });//end Meteor.call('task'
        continue;
      }//end if (lastMasterId===task.taskMaster)

      Meteor.call('exchangeRefreshToken', task.taskMaster, function (error, result) {
        if (!error) {
    //        Meteor.call('freeBusyQuery', task.taskMaster, task.startTime, task.endTime, function (error, result) {
    //        if (!error) {
          Meteor.call('task', task, function (error, id) {
            if (!error) {
              Meteor.call('addToTasks', id, function (error, result) {
                if (!error) {
                  if (task.visible)
                    Meteor.call('insertGoogleEvent', id, function (error, result) {
                      if (!error) console.log(task.taskName + " added successfully");
                      else throwError(error.reason);
                    });//end Meteor.call('addToTasks'
                } else throwError(error.reason);
              });//end Meteor.call('addToTasks'
            } else throwError(error.reason);
          });//end Meteor.call('task'
    //        } else throwError("ERROR: " + error.reason);
    //        });//end Meteor.call('freeBusyQuery'
        } else throwError(error.reason); 
      });//Meteor.call('exchangeRefreshToken'

      lastMasterId = task.taskMaster;

    }//end for loop

    Router.go('tasksList');

  }
});