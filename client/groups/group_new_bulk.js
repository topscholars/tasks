var inputData;

Template.groupNewBulk.rendered = function() {

  var $container = $("#handsOnTable");
  $container.handsontable({
    data: [],
    dataSchema: {groupName: null, subgroups: null, users: null, tasks: null, description: null},
    startRows: 5,
    startCols: 4,
    colHeaders: ['Group Name', 'Subgroups', 'Users', 'Tasks', 'Description'],
    columns: [
      {data: "groupName"},
      {data: "subgroups"},
      {data: "users"},
      {data: "tasks"},
      {data: "description"}
    ],
    minSpareRows: 25
  });

  $container.handsontable('render'); //refresh the grid to display the new value
  inputData = $container.data('handsontable').getData();
};

Template.groupNewBulk.events({
  'submit form': function(event) {
    event.preventDefault();
    $("#main-spinner").css('display', 'block');
    
    for (row in inputData) {
      console.log("INPUT DATA: " + JSON.stringify(inputData[row]));
      if (!inputData[row].groupName) break;
      //Split out the special characters
      //filter out the empty arrays if any
      //map the trim function to remove extra white spaces   
      var group = {
        groupName: inputData[row].groupName,
        subgroups: inputData[row].subgroups,
        users: inputData[row].users,
        tasks: inputData[row].tasks,  
        description: inputData[row].description,      
      };

      //store only the ids, since the objects could potentially be renamed in the future
      if (group.subgroups)
        group.subgroups = Groups.find({ groupName: { $in: group.subgroups.toString().split("@").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });       
      else group.subgroups = [];
      if (group.users)
        group.users = Meteor.users.find({ username: { $in: group.users.toString().split("#").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });        
      else group.users = [];
      if (group.tasks)
        group.tasks = Tasks.find({ username: { $in: group.tasks.toString().split("!").filter(Boolean).map(Function.prototype.call, String.prototype.trim) } }).map(function(item){ return item._id; });        
      else group.tasks = [];

      Meteor.call('group', group, function(error, id) {
        if (error) {
          // display the error to the user
          throwError(error.reason);
          
          // if the error is that the task already exists, take us there
          if (error.error === 302)
            Router.go('groupDisplay', {_errors: error.details})
        } else {
          //Add new task to DB
          Meteor.call('addToGroups', id, function(error, id) {
            if (error) throwError(error.reason);
          });        
        }
      });
    }//end for loop
    Router.go('groupsList');
  }
});