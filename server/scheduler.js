TWILIO_ACCOUNT_SID = "AC6b58a4845ee492f61186b75ff96dbdb0";
TWILIO_AUTH_TOKEN = "038418285fe4ad43f8b5b23e3454dd63";
TWILIO_NUMBER = "+14136233235";

SyncedCron.options = {
  log: false, // log debug info to the console
  collectionName: 'cronHistory', // default name of the collection used to store job history,
  utc: true, // use UTC for evaluating schedules (default: local time)
};

/////////////////////////////////////////////////////////////////////////
//////// Global functions for scheduling and unscheduling tasks /////////
/////////////////////////////////////////////////////////////////////////

Meteor.methods({
  stopGoogleChannel: function(userId) {
    Meteor.call('disableEventWatch', userId);
    if (SyncedCron.nextScheduledAtDate(userId+"-GOOGLEPUSH"))
      SyncedCron.remove(userId+"-GOOGLEPUSH");
  },
  
  setGoogleChannelRefresh: function(userId, dateTime) {

    var scheduledTimeUTC = moment(dateTime);
    var momentDate = moment.utc(scheduledTimeUTC).format("[at] HH:mm [on the] Do [day of] MMMM");

    //console.log("EXCRON_NOW: " + moment().format("[is] HH:mm [on the] Do [day of] MMMM"));
    var rightNowUTC = moment().utc();

    //Don't add a duplicate if the id already exists or if scheduled time already passed
    if (!SyncedCron.nextScheduledAtDate(userId+"-GOOGLEPUSH") && rightNowUTC <= scheduledTimeUTC){
      console.log(JSON.stringify(scheduledTimeUTC));
      // Schedule Email
      var refreshChannel = SyncedCron.add({
        _id: userId+"-GOOGLEPUSH",
        name: userId+"-GOOGLEPUSH",
        schedule: function(parser) {
          // parser is a later.parse object
          var parserDate = parser.text(momentDate);
          //console.log("PARSER: "+JSON.stringify(parserDate));  
          return parserDate;
        }, 
        job: function() {
          
          // SINCE CRON DOES NOT ALLOW US TO SPECIFY AN EXACT YEAR
          // I.E. IT SCHEDULES EVERY YEAR AT THE SPARSEST,
          // WE REALLY NEED TO CHECK THE TASK YEAR AGAINST THE SERVER YEAR
          // AND RETURN WITHOUT DOING ANYTHING IF THE YEAR DOES NOT YET MATCH
          // THIS WILL ALLOW THE SCHEDULER TO CONTINUE CHECKING SUBSEQUENT YEARS FOR A MATCH
          var rightNow = moment();
          //console.log("INCRON_NOW: " + moment(rightNow).format("[is] HH:mm [on the] Do [day of] MMMM"));
          var thisYearUTC = moment().utc().format("YYYY");
          var scheduledYearUTC = moment().utc(scheduledTimeUTC).format("YYYY");
          if (thisYearUTC < scheduledYearUTC){
            console.log("System will wait another year to run the job again.");
            return;
          }
          if (thisYearUTC > scheduledYearUTC) {
            console.log("System will delete expired job because " + thisYearUTC + ">" + scheduledYearUTC);
            SyncedCron.remove(userId+"-GOOGLEPUSH");
            return;
          }
          
          SyncedCron.remove(userId+"-GOOGLEPUSH");

          console.log("RE-SYNCING: "+userId);

          Meteor.call('exchangeRefreshToken', userId, function (error, result) {
            if (!error) {
              Meteor.call('eventWatch', userId, function (error, result) {
                if (error) throw new Meteor.Error(401, JSON.stringify(error));
              });
            } else throw new Meteor.Error(error.reason); 
          });

          return "Finished GOOGLE CHANNEL REFRESH";
        }
      });//end SyncedCron.add({
    }//end if (!SyncedCron.nextScheduledAtDate
  }
});

scheduleIt = function(user, task) {

  if (task.sms&&task.smsTime) {
    var scheduledTimeUTC = moment.utc(task.smsTime, "YYYY-MM-DD HH:mm:ss");
    //square brackets escape the words so that they don't get interpreted by moment for formatting
    var momentDate = moment.utc(scheduledTimeUTC).format("[at] HH:mm [on the] Do [day of] MMMM");
    //console.log("MOMENT: "+momentDate);

    //console.log("EXCRON_NOW: " + moment().format("[is] HH:mm [on the] Do [day of] MMMM"));
    var rightNowUTC = moment().utc();

    //Don't add a duplicate if the id already exists or if scheduled time already passed
    if (!SyncedCron.nextScheduledAtDate(task._id+"SMS"+user._id) && rightNowUTC <= scheduledTimeUTC){
      // Schedule SMS
      var smsJobId = SyncedCron.add({
        _id: task._id+"SMS"+user._id,
        name: task._id+"SMS"+user._id,
        schedule: function(parser) {
          // parser is a later.parse object
          var parserDate = parser.text(momentDate);
          //console.log("PARSER: "+JSON.stringify(parserDate));  
          return parserDate;
        }, 
        job: function() {

          // SINCE CRON DOES NOT ALLOW US TO SPECIFY AN EXACT YEAR
          // I.E. IT SCHEDULES EVERY YEAR AT THE SPARSEST,
          // WE REALLY NEED TO CHECK THE TASK YEAR AGAINST THE SERVER YEAR
          // AND RETURN WITHOUT DOING ANYTHING IF THE YEAR DOES NOT YET MATCH
          // THIS WILL ALLOW THE SCHEDULER TO CONTINUE CHECKING SUBSEQUENT YEARS FOR A MATCH
          //console.log("INCRON_NOW: " + moment().format("[is] HH:mm [on the] Do [day of] MMMM"));
          var thisYearUTC = moment().utc().format("YYYY");
          var scheduledYearUTC = moment().utc(scheduledTimeUTC).format("YYYY");
          if (thisYearUTC < scheduledYearUTC){
            console.log("System will wait another year to run the job again.");
            return;
          }
          if (thisYearUTC > scheduledYearUTC) {
            console.log("System will delete expired job because " + thisYearUTC + ">" + scheduledYearUTC);
            SyncedCron.remove(task._id+"SMS"+user._id);
            Schedules.remove({type: "SMS", taskId: task._id, userId: user._id});
            return;
          }
          if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
            console.log("Since this is not production, this job will be deleted.");
            SyncedCron.remove(task._id+"SMS"+user._id);
            Schedules.remove({type: "SMS", taskId: task._id, userId: user._id});
            return;
          }

          var twilio = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
          twilio.sendSms({
            to: user.phone, // Any number Twilio can deliver to
            from: TWILIO_NUMBER, // A number you bought from Twilio and can use for outbound communication
            body: task.sms // body of the SMS message
          }, function(err, responseData) { //this function is executed when a response is received from Twilio
            if (!err) { // "err" is an error received during the request, if any
              // "responseData" is a JavaScript object containing data received from Twilio.
              // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
              // http://www.twilio.com/docs/api/rest/sending-sms#example-1
              console.log(responseData.from);
              console.log(responseData.body);
            } else console.log(err);
          });

          //unschedule SMS from running future years
          SyncedCron.remove(task._id+"SMS"+user._id);
          Schedules.remove({type: "SMS", taskId: task._id, userId: user._id});

          return "Finished SMS";
        }
      });

      var scheduledAt = SyncedCron.nextScheduledAtDate(task._id+"SMS"+user._id);
      //console.log("NEXTJOB: "+ scheduledAt);  
      //console.log(task._id+"SMS"+user._id);

      var schedule = {
        type: "SMS",
        taskId: task._id,
        userId: user._id,
        time: scheduledAt,
        content: "FROM: " + TWILIO_NUMBER + "\r\nTO: " + user.phone
                + "\r\nTEXT: " + task.sms
      };
      Schedules.insert(schedule);

    }//end if 
  }//end if (task.smsTime)

  if (task.emailBody&&task.emailTime) {
    var taskMaster = Meteor.users.findOne(task.taskMaster);
    var fromEmail = "TS tasks <tasks@topscholars.org>";
    if (taskMaster && taskMaster.email) fromEmail = taskMaster.email;
    //console.log("FROM_EMAIL: " + fromEmail);

    var scheduledTimeUTC = moment.utc(task.emailTime, "YYYY-MM-DD HH:mm:ss");
    //square brackets escape the words so that they don't get interpreted by moment for formatting
    var momentDate = moment.utc(scheduledTimeUTC).format("[at] HH:mm [on the] Do [day of] MMMM");
    //console.log("MOMENT: "+momentDate);

    //console.log("EXCRON_NOW: " + moment().format("[is] HH:mm [on the] Do [day of] MMMM"));
    var rightNowUTC = moment().utc();

    //Don't add a duplicate if the id already exists or if scheduled time already passed
    if (!SyncedCron.nextScheduledAtDate(task._id+"EMAIL"+user._id) && rightNowUTC <= scheduledTimeUTC){
      
      // Schedule Email
      var emailJobId = SyncedCron.add({
        _id: task._id+"EMAIL"+user._id,
        name: task._id+"EMAIL"+user._id,
        schedule: function(parser) {
          // parser is a later.parse object
          var parserDate = parser.text(momentDate);
          //console.log("PARSER: "+JSON.stringify(parserDate));  
          return parserDate;
        }, 
        job: function() {

          // SINCE CRON DOES NOT ALLOW US TO SPECIFY AN EXACT YEAR
          // I.E. IT SCHEDULES EVERY YEAR AT THE SPARSEST,
          // WE REALLY NEED TO CHECK THE TASK YEAR AGAINST THE SERVER YEAR
          // AND RETURN WITHOUT DOING ANYTHING IF THE YEAR DOES NOT YET MATCH
          // THIS WILL ALLOW THE SCHEDULER TO CONTINUE CHECKING SUBSEQUENT YEARS FOR A MATCH
          var rightNow = moment();
          //console.log("INCRON_NOW: " + moment(rightNow).format("[is] HH:mm [on the] Do [day of] MMMM"));
          var thisYearUTC = moment().utc().format("YYYY");
          var scheduledYearUTC = moment().utc(scheduledTimeUTC).format("YYYY");
          if (thisYearUTC < scheduledYearUTC){
            console.log("System will wait another year to run the job again.");
            return;
          }
          if (thisYearUTC > scheduledYearUTC) {
            console.log("System will delete expired job because " + thisYearUTC + ">" + scheduledYearUTC);
            SyncedCron.remove(task._id+"EMAIL"+user._id);
            Schedules.remove({type: "email", taskId: task._id, userId: user._id});
            return;
          }
          if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
            console.log("Since this is not production, this job will be deleted.");
            SyncedCron.remove(task._id+"EMAIL"+user._id);
            Schedules.remove({type: "email", taskId: task._id, userId: user._id});
            return;
          }

          Email.send({
            from: fromEmail,
            to: user.email,
            subject: task.taskName.replace(/email: /i,""),
            text: task.emailBody
          });

          //unschedule EMAIL from running future years
          SyncedCron.remove(task._id+"EMAIL"+user._id);
          Schedules.remove({type: "email", taskId: task._id, userId: user._id});

          return "Finished EMAIL";
        }
      });    

      var scheduledAt = SyncedCron.nextScheduledAtDate(task._id+"EMAIL"+user._id);
      //console.log("NEXTJOB: "+ scheduledAt);

      var schedule = {
        type: "email",
        taskId: task._id,
        userId: user._id,
        time: scheduledAt,
        content: "FROM: " + fromEmail + "\r\nTO: " + user.email + "\r\nSUBJECT: "
                + task.taskName + "\r\nTEXT: " + task.emailBody
      };
      Schedules.insert(schedule);

    }//end if 
  }//end if(task.emailTime)

};

unscheduleIt = function (user, task) {

    //If scheduled job somehow disappeared, just move on
    if (SyncedCron.nextScheduledAtDate(task._id+"SMS"+user._id)) {
      //console.log("Removing scheduled " + task.taskName + " SMS for " + user.username);
      //unschedule SMS
      SyncedCron.remove(task._id+"SMS"+user._id);
      Schedules.remove({type: "SMS", taskId: task._id, userId: user._id});
      //console.log("REMOVED");
    }

    //If scheduled job somehow disappeared, just move on
    if (SyncedCron.nextScheduledAtDate(task._id+"EMAIL"+user._id)) {
      //console.log("Removing scheduled " + task.taskName + " EMAIL for " + user.username);
      //unschedule SMS
      SyncedCron.remove(task._id+"EMAIL"+user._id);
      Schedules.remove({type: "email", taskId: task._id, userId: user._id});
      //console.log("REMOVED");
    }
};