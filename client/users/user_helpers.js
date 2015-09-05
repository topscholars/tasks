

  //Returns the task types array
Handlebars.registerHelper('userTypesList', function() {
    switch (Meteor.user().type) {
    	case "admin":
    		return ["external", "prospective", "scholar", "parent", "counselor", "admissions", "staff", "admin"];

    	case "staff":
    		return ["external", "prospective", "scholar", "parent", "counselor", "admissions", "staff"];

    	default:
    		return ["external", "prospective", "scholar", "parent"];
    }
});

//Returns the task statuses array
Handlebars.registerHelper('userStatusesList', function() {
    return ["active", "inactive", "alumni"];
});
