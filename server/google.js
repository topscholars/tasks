Meteor.methods({

  // Obtain a new access token using the refresh token
  exchangeRefreshToken: function(userId) {
    this.unblock();
    
    var user;
    if (userId && Meteor.isServer) {
      user = Meteor.users.findOne({_id: userId});
    } else {
      user = Meteor.user();
    }

    var config = ServiceConfiguration.configurations.findOne({service: "google"});
    if (! config)
      throw new Meteor.Error(500, "Google service not configured for " + user.username + ". S/he needs to log in to grant permissions.");

    if (! user.services || ! user.services.google || ! user.services.google.refreshToken)
      throw new Meteor.Error(500, "Refresh token not found for " + user.username + ". S/he needs to log in to grant permissions.");
    
    try {
      var result = HTTP.post(
        "https://www.googleapis.com/oauth2/v3/token",
        {
          params: {
            'client_id': config.clientId,
            'client_secret': config.secret,
            'refresh_token': user.services.google.refreshToken,
            'grant_type': 'refresh_token'
          }
      });
    } catch (e) {
      var code = e.response ? e.response.statusCode : 500;
      throw new Meteor.Error(code, "Unable to exchange google refresh token for " + user.username + ". S/he needs to log in to grant permissions.", e.response);
    }
    
    if (result.statusCode === 200) {
      // console.log('success');
      // console.log(EJSON.stringify(result.data));

      Meteor.users.update(user._id, { 
        '$set': { 
          'services.google.accessToken': result.data.access_token,
          'services.google.expiresAt': (+new Date) + (1000 * result.data.expires_in),
        }
      });

      return result.data;
    } else {
      throw new Meteor.Error(result.statusCode, "Unable to exchange google refresh token for " + user.username + ". S/he needs to log in to grant permissions.", result);
    }
  },

  createAvailabilityCalendar: function(userId) {
    var user = Meteor.users.findOne(userId);
    if (user && user.services && user.services.google && 
          user.services.google.accessToken) {
      var url = "https://www.googleapis.com/calendar/v3/calendars";
      var options = {
        'headers' : {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + user.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'data': {
          "summary": "Availability - " + user.username
        }
      };

      try {
        var calendarInsertResult = HTTP.post(url, options);
      } catch (e) {
        throw new Meteor.Error(calendarInsertResult.error.response.statusCode, calendarInsertResult.error.message);
      }

      Meteor.users.update(user._id, {$set: {availabilityCalendarId: calendarInsertResult.data.id}});
      
    }//end if user
    else throw new Meteor.Error(322, user.username + " is not using Google login.");
  },

  eventWatch: function(userId) {
    var user = Meteor.users.findOne(userId);
    if (user && user.services && user.services.google && 
          user.services.google.accessToken) {

      if (GoogleChannels.findOne({userId: user._id})) 
        Meteor.call('disableEventWatch', userId);

      var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch";
      var options = {
        'headers' : {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + user.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'data': {
          "id": user._id+"-GOOGLE-"+(new Date().getTime()),
          "type": "web_hook",
          "address": process.env.ROOT_URL.replace("http://", "https://")+"calendar/events",
        }
      };

      try {
        var eventWatchResult = HTTP.post(url, options);
        console.log(JSON.stringify(eventWatchResult));
      } catch (e) {
        throw new Meteor.Error(eventWatchResult.error.response.statusCode, eventWatchResult.error.message);
      }
      
    }//end if user
    else throw new Meteor.Error(322, user.username + " is not using Google login.");
  },

  disableEventWatch: function(userId) {
    var user = Meteor.users.findOne(userId);
    if (user && user.services && user.services.google && 
          user.services.google.accessToken) {

      var channel = GoogleChannels.findOne({userId: user._id});
      if (!channel) return;

      var url = "https://www.googleapis.com/calendar/v3/channels/stop";
      var options = {
        'headers' : {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + user.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'data': {
          "id": channel.channelId,
          "resourceId": channel.resourceId
        }
      };

      GoogleChannels.remove({userId: userId});

      try {
        var disableEventWatchResult = HTTP.post(url, options);       
      } catch (e) {
        throw new Meteor.Error(disableEventWatchResult.error.response.statusCode , disableEventWatchResult.error.message);
      }

      //console.log(JSON.stringify(disableEventWatchResult));

    }//end if user
    else throw new Meteor.Error(322, user.username + " is not using Google login.");
  },

  deleteGoogleEvent: function(taskId) {
    var task = Tasks.findOne(taskId);
    var taskMaster = Meteor.users.findOne(task.taskMaster);
    if (taskMaster && taskMaster.services && taskMaster.services.google && 
          taskMaster.services.google.accessToken) {
      var e = GoogleEvents.findOne({taskId: task._id, userId: taskMaster._id});
      if(e) {
        var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/"+e.eventId;
        var options = {
          'headers' : {
            'Authorization': "Bearer " + taskMaster.services.google.accessToken,
            'X-JavaScript-User-Agent': "Google APIs Explorer"
          }
        };

        var HTTP_del = Meteor.wrapAsync(HTTP.del);
        var deleteEventResult = HTTP_del(url, options);
        if (deleteEventResult.error)
          throw new Meteor.Error(deleteEventResult.error.response.statusCode , deleteEventResult.error.message);
        else GoogleEvents.remove({taskId: task._id, userId: taskMaster._id});

      }//end if e

    }//end if user
    else throw new Meteor.Error(322, taskMaster.username + " is not using Google login.");
  },

  updateGoogleEvent: function(taskId) {
    var task = Tasks.findOne(taskId);
    var e = GoogleEvents.findOne({taskId: task._id, userId: task.taskMaster});
    
    if (!e) {
      Meteor.call('insertGoogleEvent', taskId);
      return;
    }

    var taskMaster = Meteor.users.findOne(task.taskMaster);

    if (taskMaster && taskMaster.services && taskMaster.services.google && 
          taskMaster.services.google.accessToken) {

      var startTimeUTC = moment.utc(task.startTime, "YYYY-MM-DD HH:mm:ss").format();
      var endTimeUTC = moment.utc(task.endTime, "YYYY-MM-DD HH:mm:ss").format();
      var transparency = "opaque";
      if (task.type.toUpperCase() === "RSVP_OPEN" || task.type.toUpperCase() === "HOMEWORK") transparency = "transparent";

      var attendees = Meteor.users.find({_id: {$in: task.users} }).map(function(thisUser){ 
        return {"email": thisUser.email, "displayName": thisUser.username, "responseStatus": "accepted"}; 
      });

      if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
        console.log("Since this is not production, only the Task Master will be invited to this event.");
        attendees = [{"email": taskMaster.email, "displayName": taskMaster.username, "responseStatus": "accepted"}]; 
      }

      if (task.type.toUpperCase() === "RSVP_OPEN" || task.type.toUpperCase() === "RSVP") {
        var resource = Resources.findOne(task.resource);
        if (resource) {
          var resourceAttendee = {"email": resource.email, "displayName": resource.resourceName, "responseStatus": "accepted"};
          attendees.push(resourceAttendee);          
        }
      }

      //var organizer = {"email": taskMaster.email, "displayName": taskMaster.username, "organizer": true, "responseStatus": "accepted"};
      //attendees.push(organizer);      

      var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/"+e.eventId;

      var options = {
        'headers' : {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + taskMaster.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'query': {
          'sendNotifications': false
        },
        'data': {
          //"id": task._id+taskMaster._id,
          "summary": task.taskName,
          "description": task.description,
          "transparency": transparency,
          "guestsCanInviteOthers": false,
          "guestsCanSeeOtherGuests": false,
          "location": task.location,
          "start": {
            "dateTime": startTimeUTC,
          },
          "end": {
            "dateTime": endTimeUTC,
          },
          "reminders": {
            "overrides": [],
            "useDefault": true 
          },
          "attendees": attendees,
          "source": {
            "url": process.env.ROOT_URL+"tasks/"+task._id,
            "title": "Link to task in TS alpha"
          }          
        }
      };

      var HTTP_put = Meteor.wrapAsync(HTTP.put);
      var updateEventResult = HTTP_put(url, options);
      
      if (updateEventResult.error)
        throw new Meteor.Error(deleteEventResult.error.response.statusCode , deleteEventResult.error.message);
    }//end if taskMaster
    else throw new Meteor.Error(322, taskMaster.username + " is not using Google login.");
  },

  insertGoogleEvent: function(taskId) {
    var task = Tasks.findOne(taskId);
    var taskMaster = Meteor.users.findOne(task.taskMaster);
    if (taskMaster && taskMaster.services && taskMaster.services.google && 
          taskMaster.services.google.accessToken) {

      var startTimeUTC = moment.utc(task.startTime, "YYYY-MM-DD HH:mm:ss").format();
      var endTimeUTC = moment.utc(task.endTime, "YYYY-MM-DD HH:mm:ss").format();
      var transparency = "opaque";
      if (task.type.toUpperCase() === "RSVP_OPEN" || task.type.toUpperCase() === "HOMEWORK") transparency = "transparent";

      var attendees = Meteor.users.find({_id: {$in: task.users} }).map(function(thisUser){ 
        if(task.googleCalendar||isStaff(thisUser._id))
          return {"email": thisUser.email, "displayName": thisUser.username, "responseStatus": "accepted"}; 
      });

      if (process.env.ROOT_URL !== "http://ts.topscholars.co/" && process.env.ROOT_URL !== "http://ts.topscholars.org/" && process.env.ROOT_URL !== "http://localhost:3000/" ) {
        console.log("Since this is not production, only the Task Master will be invited to this event.");
        attendees = [{"email": taskMaster.email, "displayName": taskMaster.username, "responseStatus": "accepted"}]; 
      }

      if (task.type.toUpperCase() === "RSVP_OPEN" || task.type.toUpperCase() === "RSVP") {
        var resource = Resources.findOne(task.resource);
        if (resource) {
          var resourceAttendee = {"email": resource.email, "displayName": resource.resourceName, "responseStatus": "accepted"};
          attendees.push(resourceAttendee);          
        }
      }

      //var organizer = {"email": taskMaster.email, "displayName": taskMaster.username, "organizer": true, "responseStatus": "accepted"};
      //attendees.push(organizer);

      var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      var options = {
        'headers' : {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + taskMaster.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'query': {
          'sendNotifications': false
        },
        'data': {
          //"id": task._id+taskMaster._id,
          "summary": task.taskName,
          "description": task.description,
          "transparency": transparency,
          "guestsCanInviteOthers": false,
          "guestsCanSeeOtherGuests": false,
          "location": task.location,
          "start": {
            "dateTime": startTimeUTC
          },
          "end": {
            "dateTime": endTimeUTC
          },
          "reminders": {
            "overrides": [],
            "useDefault": false 
          },
          "description": task.description,
          "attendees": attendees,
          "source": {
            "url": process.env.ROOT_URL+"tasks/"+task._id,
            "title": "Link to task in TS alpha"
          }
        }
      };

      var HTTP_post = Meteor.wrapAsync(HTTP.post);
      var insertEventResult = HTTP_post(url, options);

      if (insertEventResult.error)
        throw new Meteor.Error(insertEventResult.error.response.statusCode , insertEventResult.error.message);
      
      var gEvent = {
        taskId: task._id,
        userId: taskMaster._id,
        eventId: insertEventResult.data.id
      }
      GoogleEvents.insert(gEvent);
    }//end if taskMaster
    else throw new Meteor.Error(322, taskMaster.username + " is not using Google login.");
  },

  createGoogleResource: function(resourceId, adminId) {
    var resource = Resources.findOne(resourceId);
    var admin = Meteor.users.findOne(adminId);
    if (admin && admin.services && admin.services.google && 
          admin.services.google.accessToken) {

      var xmlContent = "<?xml version='1.0' encoding='utf-8'?>" +
                      "<atom:entry xmlns:atom='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>" +
                        "<apps:property name='resourceId' value='"+ resource._id +"'/>" +
                        "<apps:property name='resourceCommonName' value='"+ resource.resourceName +"'/>" +
                        "<apps:property name='resourceDescription' value='"+ resource.description +"'/>" +
                        "<apps:property name='resourceType' value='"+ resource.type +"'/>" +
                      "</atom:entry>";

      var url = "https://apps-apis.google.com/a/feeds/calendar/resource/2.0/topscholars.org/";
      var options = {
        'headers' : {
          'Content-Type': 'application/atom+xml',
          'Authorization': 'Bearer ' + admin.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'content': xmlContent
      };

      var HTTP_post = Meteor.wrapAsync(HTTP.post);
      var createResourceResult = HTTP_post(url, options);

      if (createResourceResult.error)
        throw new Meteor.Error(createResourceResult.error.response.statusCode , createResourceResult.error.message);
    }//end if admin
    else throw new Meteor.Error(322, admin.username + " is not using Google login.");

  },

  retrieveGoogleResource: function(resourceId, adminId) {
    var resource = Resources.findOne(resourceId);
    var admin = Meteor.users.findOne(adminId);
    if (admin && admin.services && admin.services.google && 
          admin.services.google.accessToken) {

      var url = "https://apps-apis.google.com/a/feeds/calendar/resource/2.0/topscholars.org/";
      var options = {
        'headers' : {
          'Content-Type': 'application/atom+xml',
          'Authorization': 'Bearer ' + admin.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        }
      };

      var HTTP_get = Meteor.wrapAsync(HTTP.get);
      var retrieveResourceResult = HTTP_get(url, options);

      if (!retrieveResourceResult.error) {
        var resourceEmail = retrieveResourceResult.content.split("<apps:property name='resourceEmail' value='").filter(Boolean)[1];
        var resourceEmail = resourceEmail.split("'/>").filter(Boolean)[0];
        return resourceEmail;
      } else
        throw new Meteor.Error(retrieveResourceResult.error.response.statusCode , retrieveResourceResult.error.message);
    }//end if admin
    else throw new Meteor.Error(322, admin.username + " is not using Google login.");

  },

  updateGoogleResource: function(resourceId, adminId) {
    var resource = Resources.findOne(resourceId);
    var admin = Meteor.users.findOne(adminId);
    if (admin && admin.services && admin.services.google && 
          admin.services.google.accessToken) {

      var xmlContent = "<?xml version='1.0' encoding='utf-8'?>" +
                      "<atom:entry xmlns:atom='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>" +
                        "<apps:property name='resourceCommonName' value='"+ resource.resourceName +"'/>" +
                        "<apps:property name='resourceDescription' value='"+ resource.description +"'/>" +
                        "<apps:property name='resourceType' value='"+ resource.type +"'/>" +
                      "</atom:entry>";

      var url = "https://apps-apis.google.com/a/feeds/calendar/resource/2.0/topscholars.org/"+resourceId;
      var options = {
        'headers' : {
          'Content-Type': 'application/atom+xml',
          'Authorization': 'Bearer ' + admin.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        },
        'content': xmlContent
      };

      var HTTP_put = Meteor.wrapAsync(HTTP.put);
      var updateResourceResult = HTTP_put(url, options);

      if (updateResourceResult.error)
        throw new Meteor.Error(updateResourceResult.error.response.statusCode , updateResourceResult.error.message);
    }//end if admin
    else throw new Meteor.Error(322, admin.username + " is not using Google login.");
  },

  deleteGoogleResource: function (resourceId, adminId) {

    var admin = Meteor.users.findOne(adminId);
    if (admin && admin.services && admin.services.google && 
          admin.services.google.accessToken) {

      var url = "https://apps-apis.google.com/a/feeds/calendar/resource/2.0/topscholars.org/"+resourceId;
      var options = {
        'headers' : {
          'Content-Type': 'application/atom+xml',
          'Authorization': 'Bearer ' + admin.services.google.accessToken,
          'X-JavaScript-User-Agent': "Google APIs Explorer"
        }
      };
      
      var HTTP_del = Meteor.wrapAsync(HTTP.del);
      var deleteResourceResult = HTTP_del(url, options);

      if (deleteResourceResult.error)
        throw new Meteor.Error(deleteResourceResult.error.response.statusCode , deleteResourceResult.error.message);
    }//end if admin
    else throw new Meteor.Error(322, admin.username + " is not using Google login.");
  },

  updateGmails: function (userId) {

    if (isStaff(userId)) throw new Meteor.Error(301, "Email correspondence between staff not available");

    this.unblock();
    var user = Meteor.users.findOne(userId);
    var staff = Meteor.users.find({email: {$regex: /@topscholars.org$/}, type: "staff"});
    var googleConf = ServiceConfiguration.configurations.findOne({service: 'google'});

    var prevStaffId = "";

    staff.forEach(function (thisStaff) {
      if (thisStaff && thisStaff.services && thisStaff.services.google && 
          thisStaff.services.google.accessToken) {
        if (prevStaffId===thisStaff._id) {
          var google = thisStaff.services.google;
          var client = new GMail.Client({
            clientId: googleConf.clientId,
            clientSecret: googleConf.secret,
            accessToken: google.accessToken,
            expirationDate: google.expiresAt,
            refreshToken: google.refreshToken
          });

          var query = "(to:" +thisStaff.email+ " from:" +user.email+ ") OR (to:" +user.email+ " from:" +thisStaff.email+ ")";
          if (user.email2)
            query += "OR (to:" +thisStaff.email+ " from:" +user.email2+ ") OR (to:" +user.email2+ " from:" +thisStaff.email+ ")";

          var messages = client.list(query);
          //console.log("MESSAGES: " + JSON.stringify(messages));
          messages.forEach(function (thisMessage) {
            if (!Gmails.findOne({gmailId: thisMessage.id})) {
              var date = moment(extractField(thisMessage, "Date").substring(5, 25), 'DD MMM YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm');
              var to = extractField(thisMessage, "To");
              var from = extractField(thisMessage, "From");
              var subject = extractField(thisMessage, "Subject");
              var body = messageFromPayload(thisMessage.payload, 'text/plain');
              var gmailObject = {userId:user._id, staffId:thisStaff._id, date:date, to:to, from:from, subject:subject, body:body};
              //console.log("EMAIL: " + JSON.stringify(gmailObject));
              var existingGmail = Gmails.findOne(gmailObject);
              if (existingGmail) Gmails.update(existingGmail._id, {$set: {gmailId: thisMessage.id}});
              else {
                gmailObject = {gmailId: thisMessage.id, userId:user._id, staffId:thisStaff._id, date:date, to:to, from:from, subject:subject, body:body};
                Gmails.insert(gmailObject);
              }
            }
          });

        } else {
          Meteor.call('exchangeRefreshToken', thisStaff._id, function (error, result) {
            if (!error) {
              var google = thisStaff.services.google;
              var client = new GMail.Client({
                clientId: googleConf.clientId,
                clientSecret: googleConf.secret,
                accessToken: google.accessToken,
                expirationDate: google.expiresAt,
                refreshToken: google.refreshToken
              });

              var query = "(to:" +thisStaff.email+ " from:" +user.email+ ") OR (to:" +user.email+ " from:" +thisStaff.email+ ")";
              if (user.email2)
                query += "OR (to:" +thisStaff.email+ " from:" +user.email2+ ") OR (to:" +user.email2+ " from:" +thisStaff.email+ ")";

              var messages = client.list(query);
              //console.log("MESSAGES: " + JSON.stringify(messages));
              messages.forEach(function (thisMessage) {
                if (!Gmails.findOne({gmailId: thisMessage.id})) {
                  var date = moment(extractField(thisMessage, "Date").substring(5, 25), 'DD MMM YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm');
                  var to = extractField(thisMessage, "To");
                  var from = extractField(thisMessage, "From");
                  var subject = extractField(thisMessage, "Subject");
                  var body = messageFromPayload(thisMessage.payload, 'text/plain');
                  var gmailObject = {gmailId: thisMessage.id, userId:user._id, staffId:thisStaff._id, date:date, to:to, from:from, subject:subject, body:body};
                  //console.log("EMAIL: " + JSON.stringify(gmailObject));
                  var existingGmail = Gmails.findOne(gmailObject);
                  if (existingGmail) Gmails.update(existingGmail._id, {$set: {gmailId: thisMessage.id}});
                  else {
                    gmailObject = {gmailId: thisMessage.id, userId:user._id, staffId:thisStaff._id, date:date, to:to, from:from, subject:subject, body:body};
                    Gmails.insert(gmailObject);
                  }
                }
              });
            }// else throw new Meteor.Error(301, error.reason);
          });//end Meteor.call('exchangeRefreshToken'
          prevStaffId = thisStaff._id;
        }
      }//if (staff && staff.services && staff.services.google && 
    });//end staff.forEach
  }
});

var extractField = function(json, fieldName) {
  return json.payload.headers.filter(function(header) {
    return header.name === fieldName;
  })[0].value;
};

var messageFromPayload = function (payload, mimeType) {
  var emailBody = payload.body;
  if (emailBody.size) {
    return decodeBase64(emailBody.data);
  } else if (payload.parts && payload.parts.length) {
    var result = null;
    var parts = payload.parts;
    _.each(parts, function (part) {
      if (part.mimeType !== mimeType)
        return;
      result = decodeBase64(part.body.data);
    });
    return result;
  }
};

decodeBase64 = function (data) {
  return new Buffer(data, 'base64').toString('utf8');
};