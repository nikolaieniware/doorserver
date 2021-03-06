var assert = require('assert');
var sinon = require('sinon');
var doorserver = require('../../lib/doorserver');

describe('door service', function () {

  describe("o", function() {
    it("should return true if doorHoldState is DOOR_OPEN per door", function() {
      var door = new doorserver.models.Door({id : 1000, doorname : "test door"});
      doorserver.services.door.doorHoldState[1000] = doorserver.services.door.DOOR_OPEN;
      assert.equal(true, doorserver.services.door.isDoorOpen(door));
    });

    it("should return false if doorHoldState is DOOR_CLOSED per door", function() {
      var door = new doorserver.models.Door({id : 1000, doorname : "test door"});
      doorserver.services.door.doorHoldState[1000] = doorserver.services.door.DOOR_CLOSED;
      assert.equal(false, doorserver.services.door.isDoorOpen(door));
    });

    it("should return false for unknown door", function() {
      var door = new doorserver.models.Door({id : 1002, doorname : "test door"});
      assert.equal(false, doorserver.services.door.isDoorOpen(door));
    });

  });

  describe("openDoor", function() {
    it("should open door", function (done) {
      var settings_get = sinon.stub(doorserver.settings, 'get', function (key) {
        switch (key) {
          case "doors":
            return {
              "1000":{
                relay_pin:1,
                buzzer_pin:4,
                door_open_time:200,
                buzzer_time:50
              }
            };
        }
      });

      var piface_on = sinon.stub(doorserver.drivers.piface, 'on', function (pin) {
        assert.equal(1, pin);
      });

      var door = new doorserver.models.Door({id : 1000, doorname : "test door"});

      doorserver.services.door.openDoor(door, function (err) {
        assert.ifError(err);
        assert.ok(piface_on.called);
        assert.ok(settings_get.called);
        assert.equal(doorserver.services.door.doorHoldState[1000], doorserver.services.door.DOOR_OPEN);
        piface_on.restore();
        settings_get.restore();
        done();
      });
    });
  });

  describe("closeDoor", function() {
    it("should close door", function (done) {
      var settings_get = sinon.stub(doorserver.settings, 'get', function (key) {
        switch (key) {
          case "doors":
            return {
              "1000":{
                relay_pin:1,
                buzzer_pin:4,
                door_open_time:200,
                buzzer_time:50
              }

            }
        }
      });

      var piface_off = sinon.stub(doorserver.drivers.piface, 'off', function (pin) {
        assert.equal(1, pin);
      });

      var door = new doorserver.models.Door({id : 1000, doorname : "test door"});


      doorserver.services.door.closeDoor(door, function (err) {
        assert.ok(piface_off.called);
        assert.ok(settings_get.called);
        assert.equal(doorserver.services.door.doorHoldState[1000], doorserver.services.door.DOOR_CLOSED);
        piface_off.restore();
        settings_get.restore();
        done();
      });
    });

    it("should not close door if door is help temporarily open", function (done) {
      var settings_get = sinon.stub(doorserver.settings, 'get', function (key) {
        switch (key) {
          case "doors":
            return {
              "1000":{
                relay_pin:1,
                buzzer_pin:4,
                door_open_time:200,
                buzzer_time:50
              }

            }
        }
      });

      var piface_off = sinon.stub(doorserver.drivers.piface, 'off', function (pin) {
        assert.equal(1, pin);
      });

      doorserver.services.door.doorTemporarilyOpen["1000"] = true;

      doorserver.services.door.closeDoor(1000, function (err) {
        assert.equal(false, piface_off.called);
        assert.ok(settings_get.called);
        assert.equal(doorserver.services.door.doorHoldState["1000"], doorserver.services.door.DOOR_CLOSED);
        assert.equal(doorserver.services.door.doorTemporarilyOpen["1000"], true);
        piface_off.restore();
        settings_get.restore();
        done();
      });
    });

  });


  describe("openDoorForAMoment", function () {

    it("should open door according to settings when door was closed", function (done) {
      var settings_get = sinon.stub(doorserver.settings, 'get', function (key) {
        switch (key) {
          case "doors":
            return {
              "1000":{
                relay_pin:1,
                buzzer_pin:4,
                door_open_time:200,
                buzzer_time:50
              }

            }
        }
      });

      var sequence = [];

      var settimeout = sinon.stub(global, 'setTimeout', function (cb, delay) {
        process.nextTick(function() {
          sequence.push(["delay", delay]);
          cb();
        });
      });

      var door = new doorserver.models.Door({id : 1000, doorname : "front door"});

      var piface_on = sinon.stub(doorserver.drivers.piface, 'on', function (pin) {
        sequence.push(["on", pin]);

        // Door should now be marked as temporarily open
        if (pin === 1) {
          assert.ok(doorserver.services.door.doorTemporarilyOpen[1000]);
        }
      });

      var piface_off = sinon.stub(doorserver.drivers.piface, 'off', function (pin) {
        sequence.push(["off", pin]);

        // Door should no longer be marked as temporarily open
        if (pin === 1) {
          assert.equal(doorserver.services.door.doorTemporarilyOpen[1000], undefined);
        }

      });

      doorserver.services.door.openDoorForAMoment(door);

      setTimeout(function() {
        //console.log(sequence);

        // We'll build a sequence of events which took place according to
        // our two probes. Notice that the setTimeout callbacks are not executed
        // in the delay order. They are simply postponed until last tick.
        // Thus the sequential event order might change if a big refactor
        // is done.
        assert.deepEqual(sequence[0], ["on", 1]); // First turn relay pin on
        assert.deepEqual(sequence[1], ["on", 4]); // Then turn buzzer pin on
        assert.deepEqual(sequence[2], ["delay", 200]); // Schedule door close delay
        assert.deepEqual(sequence[3], ["off", 1]); // And close the door after delay
        assert.deepEqual(sequence[4], ["delay", 50]); // Schedule buzzer close delay
        assert.deepEqual(sequence[5], ["off", 4]); // And turn buzzer off

        settings_get.restore();
        piface_on.restore();
        piface_off.restore();
        settimeout.restore();
        done();

      }, 250);
    });

    it("should only buzz when door was already open", function (done) {

      doorserver.services.door.doorHoldState[1000] = doorserver.services.door.DOOR_OPEN;

      var settings_get = sinon.stub(doorserver.settings, 'get', function (key) {
        switch (key) {
          case "doors":
            return {
              "1000":{
                relay_pin:1,
                buzzer_pin:4,
                door_open_time:200,
                buzzer_time:50
              }

            }
        }
      });

      var sequence = [];

      var settimeout = sinon.stub(global, 'setTimeout', function (cb, delay) {
        process.nextTick(function() {
          sequence.push(["delay", delay]);
          cb();
        });
      });

      var piface_on = sinon.stub(doorserver.drivers.piface, 'on', function (pin) {
        assert.ok(pin !== 1, "Pin 1 (door lock) should not be modified");
        sequence.push(["on", pin]);
      });

      var piface_off = sinon.stub(doorserver.drivers.piface, 'off', function (pin) {
        assert.ok(pin !== 1, "Pin 1 (door lock) should not be modified");
        sequence.push(["off", pin]);
      });

      var door = new doorserver.models.Door({id : 1000, doorname : "front door"});
      doorserver.services.door.openDoorForAMoment(door);

      setTimeout(function() {

        assert.deepEqual(sequence[0], ["on", 4]); // Turn buzzer pin on
        assert.deepEqual(sequence[1], ["delay", 50]); // Schedule buzzer close delay
        assert.deepEqual(sequence[2], ["off", 4]); // And turn buzzer off

        settings_get.restore();
        piface_on.restore();
        piface_off.restore();
        settimeout.restore();

        done();

      }, 250);
    });

  });


});