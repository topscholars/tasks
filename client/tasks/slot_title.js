Template.slotTitle.helpers({
  startTime: function() {
    return this.start.substr(10,15);
  },
  endTime: function() {
    return this.end.substr(10,15);
  },
  showSlot: function() {
    var rightNow = moment().format('YYYY-MM-DD HH:mm');
    return rightNow < this.start;
  }
 });