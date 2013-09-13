var doorserver = require('../doorserver');

exports.checkAllDoors = function(ts, cb) {

  var doors = Object.keys(doorserver.settings.get("doors"));

  (function next(i) {
    if (i < 0) {
      if (cb) {
        cb();
      }
      return;
    }


    var door_id = Number(doors[i]);

    exports.checkSingleDoor(ts, door_id, function (err) {
      next(i - 1);
    });

  })(doors.length - 1);

};

exports.checkSingleDoor = function(ts, door_id, cb) {

  exports.shouldDoorBeOpen(ts, door_id, function (err, shoudBeOpen, because_of_rule) {

    cb(err);
  });
};

exports.shouldDoorBeOpen = function (ts, door_id, cb) {

  doorserver.repositories.doorRepository.findDoorById(door_id, function (err, door) {
    if (err) {
      cb(err);
      return;
    }

    /*
     if (door === null) {
     console.error("Could not find door", door_id, "from database but it was in settings!");
     cb(null, false);
     return;
     }
     */

    if (!door.timeperiod_id) {
      cb(null, false);
      return;
    }

    doorserver.services.timeperiod.evaluateTimeperiod(ts, door.timeperiod_id, function (err, shouldBeOpen, because_of_rule) {
      if (err) {
        cb(err);
        return;
      }

      cb(null, shouldBeOpen, because_of_rule);
    });

  });
};