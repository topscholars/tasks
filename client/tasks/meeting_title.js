Template.meetingTitle.helpers({
  timePretty: function() {
    return moment(this.start).format('ddd, MMM Do, h:mm a') + " - " + moment(this.end).format('h:mm a');
  }

});
