Template.taskTypeSelector.helpers({ 
  
selectedType: function(taskType) {
	//If it is the new task page, always use the first status as default
	if (window.location.pathname.indexOf('new') !== -1)
		return false;
	var thisTask = Tasks.findOne(Session.get('currentTaskId'));
	if (!thisTask) return false;
	return taskType === thisTask.type;
}

});
