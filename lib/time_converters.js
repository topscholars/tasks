
jsUTCtoLocalTime = function (datetime) {
  //console.log("DATETIME: "+datetime);
  return moment(datetime).format("ddd MMM Do h:mm a");
};

localTime = function(time) {
    var localTime = moment.utc(time, "YYYY-MM-DD HH:mm:ss").toDate();
    return moment(localTime).format("YYYY-MM-DD HH:mm");
};