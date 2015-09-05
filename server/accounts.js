Accounts.config({
	sendVerificationEmail: true, 
	forbidClientAccountCreation: false
}); 

Accounts.onLogin(function (attempt) {
    //console.log("ATTEMPT: " + JSON.stringify(attempt));
    var userId = attempt.user._id;
    var loginIP = attempt.connection.clientAddress;
    if (loginIP) Meteor.users.update({_id:userId}, {$set:{"loginIP": loginIP}});
    if (attempt.user.services && attempt.user.services.google) {
        //var sessionToken = attempt.user.services.google.accessToken;
        //if (sessionToken) Meteor.users.update({_id:userId}, {$set:{"sessionToken": sessionToken}});
        // copy accross new info
        var given_name = attempt.user.services.google.given_name;
        var family_name = attempt.user.services.google.family_name;
        Meteor.users.update({_id:userId}, {$set:{firstName: given_name}});
        Meteor.users.update({_id:userId}, {$set:{lastName: family_name}});
        var user = Meteor.users.findOne(userId);
        var username = given_name + " " + family_name;
        if (user.nickName) username = given_name+" "+user.nickName+" "+family_name;
        Meteor.users.update({_id:userId}, {$set:{username: username}});
        Meteor.users.update({_id:userId}, {$set:{profile: {name: username}}});
    }
});

// Partially adapted from http://ondrej-kvasnovsky.blogspot.com/2013/07/meteor-how-to-login-with-github-account.html
Accounts.onCreateUser(function (options, user) {
    
    if (user.services.google) {
        if (options.profile) {
            user.profile = options.profile;
            //console.log("OPTIONS: " + JSON.stringify(options));
        }

        //console.log("USER: " + JSON.stringify(user.services.google));
        //We're only using one external login service (Google) now 
        //but in the future we can add more, so var service is generic
        var service = _.keys(user.services)[0]; 
        var email = user.services[service].email; //Google email overrides all others
        if (!email) {
            if (user.emails) {
                email = user.emails[0].address;
            }
        }
        if (!email) {
            email = options.email;
        }
        if (!email) {
  	      // if email is not set, there is no way to link it with other accounts
      		throw new Meteor.Error(403, "Your email address is missing.");
        }
        
        // see if any existing user has this email address, otherwise create new
        var existingUser = Meteor.users.findOne({'emails.address': email});
        if (!existingUser) {
            // check for email also in Google
            var existingGoogleUser = Meteor.users.findOne({'services.google.email': email});
            if (existingGoogleUser) {
                existingUser = existingGoogleUser;
                if (user.emails) {
                    // user is signing in by email, we need to set it to the existing user
                    existingUser.emails = user.emails;
                }
            } else {//no existing users, so validate and initialize
                user.email = email;
                //don't need to verify external login
                user.emails = [{"address": email, "verified": true}]; 
                user.firstName = user.services[service].given_name; //from external login
                user.lastName = user.services[service].family_name;  //from external login
                user.username = user.firstName + " " + user.lastName;
                if (user.nickName) user.username = user.firstName + " " + user.nickName + " " + user.lastName;
                user.type = getUserType(email);
				        user.status = 'active';

                //console.log("USER: " + JSON.stringify(user));
				        return user;
            }
        }
 
        // precaution, these will exist from accounts-password if used
        if (!existingUser.services) {
            existingUser.services = { resume: { loginTokens: [] }};
        }
 
        //console.log("USER: " + JSON.stringify(user));
        //console.log("EXISTINGUSER: " + JSON.stringify(existingUser));

        // copy accross new info
        existingUser.services[service] = user.services[service];
        existingUser.firstName = user.services[service].given_name; //from external login
        existingUser.lastName = user.services[service].family_name;  //from external login
        existingUser.username = existingUser.firstName + " " + existingUser.lastName;
        if (existingUser.nickName) existingUser.username = existingUser.firstName + " " + existingUser.nickName + " " + existingUser.lastName;
        existingUser.email = user.services[service].email;
        //don't need to verify external login
        existingUser.emails = [{"address": user.services[service].email, "verified": true}]; 
        if (user.services.resume){
            existingUser.services.resume.loginTokens.push(
                user.services.resume.loginTokens[0]
            );
        }
 
        // even worse hackery
        Meteor.users.remove({_id: existingUser._id}); // remove existing record
        return existingUser;    		      // record is re-inserted
    }//end if user.services.google

    //If there are no external login services
    user.email = user.emails[0].address;
    user.type = getUserType(user.email);
    user.status = 'active';
    return user;


});

getUserType = function(email) {
    var idx = email.lastIndexOf('@');
    console.log("IDX: " + email.slice(idx));
    if (email === 'artitw@gmail.com') {
        return 'admin';
    }else if (idx > -1 && email.slice(idx) === '@topscholars.org') {
        // true if the address ends with @topscholars.org
        return 'staff';
    }else {
        return 'scholar';
    }
};

// first, remove configuration entry in case service is already configured
if (ServiceConfiguration.configurations) {
    ServiceConfiguration.configurations.remove({
      service: "google"
    });
}

switch (process.env.ROOT_URL) {
    case "http://ts.topscholars.org/":
        ServiceConfiguration.configurations.insert({
          service: "google",
          clientId: "822629112271-kkd1ashnvkt8f7pojo8e351i5pprcg73.apps.googleusercontent.com",
          secret: "c3egzlRRvubSuFHDmoKIXzC4"
        });
        break;
    case "http://ts.topscholars.co/":
        ServiceConfiguration.configurations.insert({
          service: "google",
          clientId: "636399481090-ijfqshapd5g8o1jrc7mhilv3li36r60g.apps.googleusercontent.com",
          secret: "wEOr1GVkA4ta_kIX3ceyNb8R"
        });
        break;
    case "http://ts2.topscholars.co/":
        ServiceConfiguration.configurations.insert({
          service: "google",
          clientId: "131509116890-6122f3jqnbo18qhtcq08qmtgeh0j3mrr.apps.googleusercontent.com",
          secret: "xBNLhMN4ma9cKCBFTFfO8XTL"
        });
        break;
    case "http://localhost:3000/":
        ServiceConfiguration.configurations.insert({
          service: "google",
          clientId: "582599278187-m4p5d03fpq8aiike48urmt774fs6el75.apps.googleusercontent.com",
          secret: "Hc209Y0eirCR0N63xIGhKCJI"
        });
        break;
}

