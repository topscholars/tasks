exec = Npm.require('child_process').exec;

Meteor.methods({
  'updateCalls' : function(userId) {
    if (isStaff(userId)) throw new Meteor.Error(301, "Call correspondence between staff not available");

    this.unblock();
	  Fiber = Npm.require('fibers');
    var today = moment().add(1, "days").format("YYYY-MM-DD");
    var startDate = "1900-01-01";
    var latestCall = Calls.findOne({}, {sort: { dateTime: -1} , limit: 1});
    if (latestCall) startDate = moment(latestCall.dateTime, "YYYY-MM-DD HH:mm:ss").subtract(1, "days").format("YYYY-MM-DD");
    var command = '/usr/bin/wget --user=telepH4Ring7Ring9Hangup --password=askozia1 https://pbx.topscholars.org:444/status_cdr.php --no-check-certificate --post-data "SubmitCSVCDR=submit&extension_number=all&cdr_filter=incomingoutgoing&period_from='+startDate+'&period_to='+today+'&date_format=Y-m-d&time_format=H:i:s&page_format=A4" -q -O CDR'+startDate+'.csv; cat CDR'+startDate+'.csv';
    //console.log("startDate: " + startDate);
    exec(command, {maxBuffer: 9000*1024}, function(error, stdout, stderr) {
      Fiber(function() {
        var NUM_HEADERS = 25;
        var rows = stdout.split('\n');
        //var headers = rows[0].split(';');
        //for (var i = 0; i < NUM_HEADERS; i++ )
        //  console.log(headers[i]);

        for (var i = 1; i < rows.length; i++ ) {
          var cols = rows[i].split(';');
          if (cols.length !== NUM_HEADERS) continue;
          var thisCall = {from: "+66"+cols[1], to: "+66"+cols[2].substring(1,10), dateTime: cols[9], duration: cols[12], status: cols[14]};
          //console.log("thisCall: " + JSON.stringify(thisCall));
          var existingRecord = Calls.findOne(thisCall);
          if (!existingRecord) Calls.insert(thisCall);   
        }//end for
      }).run();
    });//end exec
  }
});