Template.taskStatusSelector.helpers({ 
  
selectedStatus: function(taskStatus) {
	//If it is the new task page, always use the first status as default
	if (window.location.pathname.indexOf('new') !== -1)
		return false;
	var thisTask = Tasks.findOne(Session.get('currentTaskId'));
	if (!thisTask) return false;
	return taskStatus === thisTask.status;
}

});
