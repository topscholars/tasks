Template.noteNew.rendered = function() {    
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

  // passing in `null` for the `options` arguments will result in the default
  // options being used
  $('#tokenfield-typeahead-users').tokenfield({
    typeahead: [null, { 
      name: 'users',
      displayKey: 'label',
      source: users.ttAdapter() 
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
    }]
  });
};

Template.noteNew.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');

    var newNote = {
      text: $(event.target).find('[id=userNote]').val()
    }

    var userId = $('[id=tokenfield-typeahead-users]').val().toString().split(",").filter(Boolean).map(Function.prototype.call, String.prototype.trim)[0];
    
    Meteor.call('addUserNote', newNote, userId);
    
    Router.go('notesList');
  }
});
