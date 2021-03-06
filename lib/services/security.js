var doorserver = require('../doorserver');

/**
 * Business logic that determines if an user (User model object) is allowed
 * to open a door (Door model which contains id property).
 *
 * Currently simply allows passage if the user belongs to a group that is allowed
 * to open the door.
 *
 * This could be expaned with logic that checks if the group has an attached
 * timeperiod and checks if the timeperiod allows the current time.
 *
 * @param user User model object.
 * @param door Door model
 * @param cb
 */
exports.isUserAllowedToOpenDoor = function (user, door, cb) {

  doorserver.repositories.userRepository.findAllGroupsForUserForDoor(user.id, door, function (err, groups) {

    if (groups.length > 0) {
      exports.reportUserSecurityPass(user, groups);
      cb(null, true);
    } else {
      exports.reportUserSecurityDenial(user);
      cb(null, false);
    }

  });

};

exports.reportUserSecurityPass = function(user, groups) {
  var groupnames = "";
  for (var i = 0; i < groups.length; i++) {
    groupnames += "\"" + groups[i].groupname + "\", ";
  }
  groupnames = groupnames.substring(0, groupnames.length - 2);
  console.log((new Date().toISOString()) + " User " + user.name + " (" + user.id + ") is allowed to access door \"" + groups[0].doorname + "\" via the following " + groups.length + " group" + (groups.length > 1 ? "s: " : ": ") + groupnames);

};

exports.reportUserSecurityDenial = function(user) {
  console.log((new Date().toISOString()) + " Known user " + user.name + " (" + user.id + ") tried to access but was denied");

};
