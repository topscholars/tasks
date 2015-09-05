getUTCString = function(timeString) {
  var localTime = moment(timeString, "YYYY-MM-DD HH:mm").toDate();
  return moment.utc(localTime).format("YYYY-MM-DD HH:mm:ss");
};

// Convert to Monday, Sept. 26, 2014, 4:10 pm format
friendlyTime = function (datetime) {
  var localTime = moment(datetime, "YYYY-MM-DD HH:mm:ss").toDate();
  return moment(localTime).format("ddd MMM Do h:mm a");
};

homeworkAutoTime = function (datetime) {
  var localTime = moment(datetime, "YYYY-MM-DD HH:mm:ss").toDate();
  console.log("DATETIME: " + datetime);
  console.log("LOCALTIME: " + localTime);
  return moment(localTime).subtract(3, 'days').format("YYYY-MM-DD HH:mm");
};

smsAutoTime = function (datetime) {
  var localTime = moment(datetime, "YYYY-MM-DD HH:mm:ss").toDate();
  return moment(localTime).subtract(1, 'days').format("YYYY-MM-DD HH:mm");
};

//Returns the task types array
Handlebars.registerHelper('taskTypesList', function() {
    return ["email", "form", "meeting", "followup", "call", "homework", "class", "event"].sort();
});

//Returns the task statuses array
Handlebars.registerHelper('taskStatusesList', function() {
    return ["active", "inactive"];
});

Handlebars.registerHelper('dueDurations', function() {
    return [{value:"0", label:"none"}, {value:"1", label:"within 1 week"}, {value:"2", label:"within 2 weeks"}, {value:"3", label:"within 3 weeks"}, {value:"4", label:"within 4 weeks"}];
});

Handlebars.registerHelper('slotDurations', function() {
    return [{value:"60", label:"for 1 hour"}, {value:"90", label:"for 1 hour 30 mins"}, {value:"120", label:"for 2 hours"}];
});

Handlebars.registerHelper('timeHelper', function(time, type) {
  switch( type ) {
    case "homework":
      if (time == "start") return "Assigned";
      if (time == "end") return "Due";
      break;
    case "course":
      if (time == "start") return "Starts";
      if (time == "end") return "Ends";
      break;
    default:
      if (time == "start") return "Starts";
      if (time == "end") return "Ends";
      break;
  }
});

Meteor.setInterval(function() {
  var type = $('[name=type]').val();
  switch( type ) {
    case "homework":
      $("span[for='startTime']").text("Assigned");
      $("span[for='endTime']").text("Due");
      break;
    case "course":
      $("span[for='startTime']").text("Starts");
      $("span[for='endTime']").text("Ends");
      break;
    default:
      $("span[for='startTime']").text("Starts");
      $("span[for='endTime']").text("Ends");
      break;
  }
}, 1000);