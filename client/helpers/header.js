
Template.header.events({
  'click #login-buttons': function(e) {
    e.preventDefault();
    if (Meteor.user() && $('#login-buttons-my-account').length===0) {
      var loginButtonsMyAccount = "<div class='login-button' id='login-buttons-my-account'>&#9788; My Account</div>";
      $('#login-buttons-open-change-password').before(loginButtonsMyAccount);
    }
  },

  'click #login-buttons-my-account': function(e) {
    e.preventDefault();
    Router.go('userEdit', {_id: Meteor.userId()});
  },

  'click a.dropdown-toggle.my-account-icon': function(e) {
    e.preventDefault();
    // var closeDiv = document.getElementsByClassName("login-close-text")[0];
    // closeDiv.parentNode.removeChild(closeDiv);
    // if (Meteor.user() && $('a#login-reset-text').length===0) {
    //   var loginButtonsResetText = "<a class='login-close-text' id='login-reset-text'>reset</div>";
    //   $('#login-buttons-change-password').after(loginButtonsResetText);
    // }
    if ($('a#login-name-link').length!==0)
      $("a#login-name-link").get(0).click();
    if ($('a#login-sign-in-link').length!==0)
      $("a#login-sign-in-link").get(0).click();
    if($('li.dropdown.my-account').hasClass("open"))
      $('li.dropdown.my-account').removeClass("open");
    else
      $('li.dropdown.my-account').addClass("open");
    return false;  
  },
  'show.bs.dropdown li.dropdown.my-account': function(e) {
    e.preventDefault();
    return false;
  },
  'hide.bs.dropdown li.dropdown.my-account': function(e) {
    e.preventDefault();
    return false;
  }
});


Template.header.helpers({
  activeRouteClass: function(/* route names */) {
    var args = Array.prototype.slice.call(arguments, 0);
    
    // console.log("ARGS: " + args)

    args.pop();

    // console.log("ARGS_POP " + args)
    
    var active = _.any(args, function(name) {
      var currentRoute = Router.current().route.getName();  //note that location.pathname is not reactive
      return currentRoute &&
        name === currentRoute ? 'active' : '';
    });
    
    // console.log("NAME: " + name)
    // console.log("ACTIVE: " + active)

    return active && 'active';
  },
// Code above adapted from 
// Discover Meteor book
// and
// http://robertdickert.com/blog/2014/05/09/set-up-navigation-with-iron-router-and-bootstrap/

  homeText: function() {
    if ($(window).width() <= 768)
      return " TS Alpha";
    return "";
  },

  bookmarksText: function() {
    if ($(window).width() <= 768)
      return " Bookmarks";
    return "";
  },

  calendarText: function() {
    if ($(window).width() <= 768)
      return " Calendar";
    return "";
  },

  dashboardText: function() {
    if ($(window).width() <= 768)
      return " Dashboard";
    return "";
  },

  briefcaseText: function() {
    if ($(window).width() <= 768)
      return " Briefcase";
    return "";
  },

  addText: function() {
    if ($(window).width() <= 768)
      return " Add Items";
    return "";
  },

  searchText: function() {
    if ($(window).width() <= 768)
      return " Search";
    return "";
  },

  testingText: function() {
    if (window.location.hostname === "ts.topscholars.org" )
      return '<span class="glyphicon glyphicon-exclamation-sign"></span> The TS app has moved. Please go to <a href="http://ts.topscholars.co/">ts.topscholars.co</a>';
    if (window.location.hostname !== "ts.topscholars.co" )
      return '<span class="glyphicon glyphicon-exclamation-sign"></span> This is the test site. For the live site, go <a href="http://ts.topscholars.co/">here</a>';
    return "";
  },

  mobileView: function() {
    return $(window).width() <= 768;
  }   
});



