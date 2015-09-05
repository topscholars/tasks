var inputData;

Template.userNewBulk.rendered = function() {

  var $container = $("#handsOnTable");
  $container.handsontable({
    data: [],
    dataSchema: {
      firstName: null, 
      nickName: null, 
      lastName: null, 
      birthdate: null, 
      type: null, 
      email: null, 
      phone: null, 
      groups: null, 
      tasks: null, 
      status: null, 
      address1: null, 
      address2: null, 
      city: null, 
      state: null, 
      postalCode: null,
      country: null },
    startRows: 5,
    startCols: 4,
    colHeaders: [
    'First Name', 
    'Nickname', 
    'Last Name', 
    'Birthdate',
    'Type', 
    'Email', 
    'Phone', 
    'Groups', 
    'Tasks', 
    'Status',
    'Address 1',
    'Address 2',
    'City',
    'State',
    'Postal Code',
    'Country'],
    columns: [
      {data: "firstName"},
      {data: "nickName"},
      {data: "lastName"},
      {data: "birthdate"},      
      {data: "type"},
      {data: "email"},
      {data: "phone"},
      {data: "groups"},
      {data: "tasks"},
      {data: "status"},
      {data: "address1"},
      {data: "address2"},
      {data: "city"},
      {data: "state"},
      {data: "postalCode"},
      {data: "country"}   
    ],
    minSpareRows: 25
  });

  $container.handsontable('render'); //refresh the grid to display the new value
  inputData = $container.data('handsontable').getData();
};

Template.userNewBulk.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
    for (row in inputData) {
      console.log("INPUT DATA: " + JSON.stringify(inputData[row]));
      if (!inputData[row].firstName) break;
      //Split out the special characters
      //filter out the empty arrays if any
      //map the trim function to remove extra white spaces   
      var user = {
        firstName: inputData[row].firstName,
        nickName: inputData[row].nickName,
        lastName: inputData[row].lastName,
        birthdate: inputData[row].birthdate,
        type: inputData[row].type,
        email: inputData[row].email,   
        phone: inputData[row].phone,   
        status: inputData[row].status,      
        groups: inputData[row].groups,  
        tasks: inputData[row].tasks,
        address1: inputData[row].address1,   
        address2: inputData[row].address2,   
        city: inputData[row].city,      
        state: inputData[row].state,  
        postalCode: inputData[row].postalCode,
        country: inputData[row].country,  
      };
      
      user.username = user.firstName + " " + user.lastName;
      if (user.nickName) user.username = user.firstName + " " + user.nickName + " " + user.lastName;

      //store only the ids, since the objects could potentially be renamed in the future
      if (user.groups)
        user.groups = Groups.find({ groupName: { $in: user.groups.toString().split("@").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });
      else user.groups = [];
      if (user.tasks)
        user.tasks = Tasks.find({ taskName: { $in: user.tasks.toString().split("!").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });
      else user.tasks = [];

      Meteor.call('user', user, function(error, id) {
        if (error) {
          // display the error to the user
          throwError(error.reason);
          
          // if the error is that the user already exists, take us there
          if (error.error === 302)
            Router.go('userDisplay', {_errors: error.details})
        } else {
          //Add new task to DB
          Meteor.call('addToUsers', id, function(error, id) {
            if (error) throwError(error.reason);
          });        
        }
      });
    }//end for loop
    Router.go('usersList');
  }
});