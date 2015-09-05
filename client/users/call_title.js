
Template.callTitle.rendered = function() {
  $('[data-toggle="popover"]').popover({ 'trigger': 'hover', 'placement': 'auto top'});

  var users = new Bloodhound({
    datumTokenizer: function(d) {
      return Bloodhound.tokenizers.whitespace(d.label);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      // url points to a json file that contains an array of tokens
      url: '/users/JSON'
    }
  });

  //This seems to refresh my prefetch data
  users.clearPrefetchCache();
  //not sure whether setting to true does anything 
  //though, but according to the bloodhound.js it should force a reinitialise
  users.initialize(true);// kicks off the loading/processing of `local` and `prefetch`

  var thisCall = Template.instance().data;
  //console.log("CALL: " + JSON.stringify(thisCall));

  // passing in `null` for the `options` arguments will result in the default
  // options being used
  $('#tokenfield-typeahead-staff'+thisCall._id).tokenfield({
    typeahead: [null, { 
      name: 'users',
      displayKey: 'label',
      source: users.ttAdapter() 
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
    }]
  });

  if (thisCall.staff) {
    var staff = Meteor.users.findOne(thisCall.staff);
    var tokens = [{value: staff._id, label: staff.username + " <" + staff.email + ">"}];
    $('#tokenfield-typeahead-staff'+thisCall._id).tokenfield('setTokens', tokens);      
  }
};

Template.callTitle.helpers({
  toLink: function() {
    if (this.to.length === 12) //+66826967931
    {
      var user = Meteor.users.findOne({phone: this.to});
      if (user) return "/users/"+user._id;
    }
    var staff = Meteor.users.findOne(this.staff);
    if (staff) return "/users/"+staff._id;
    return "";
  },
  fromLink: function() {
    if (this.from.length === 12) //+66826967931
    {
      var user = Meteor.users.findOne({phone: this.from});
      if (user) return "/users/"+user._id;
    }
    var staff = Meteor.users.findOne(this.staff);
    if (staff) return "/users/"+staff._id;
    return "";
  },
  toName: function() {
    if (this.to.length === 12) //+66826967931
    {
      var user = Meteor.users.findOne({phone: this.to});
      if (user) return user.username;
    }
    var staff = Meteor.users.findOne(this.staff);
    if (staff) return staff.username;
    return this.to;
  },
  fromName: function() {
    if (this.from.length === 12) //+66826967931
    {
      var user = Meteor.users.findOne({phone: this.from});
      if (user) return user.username;
    }
    var staff = Meteor.users.findOne(this.staff);
    if (staff) return staff.username;
    return this.from;
  },
  durationText: function() {
    var minutes = Math.floor(this.duration/60);
    var seconds = this.duration%60;
    var durationPretty = "";
    if (minutes && seconds) durationPretty = minutes + " m, " + seconds + " s";
    else if (minutes) durationPretty = minutes + " m";
    else if (seconds) durationPretty = seconds + " s";
    return durationPretty;
  },
  noteText: function() {
    var note = Notes.findOne({callId: this._id});
    if (note) return note.text;
    return "";
  }
});

