// QSesame Homebridge
// Brendan DeBrincat http://quacktacular.net
// Created: June 4, 2017 (and updated many times!)

// Instantiate global plugin vars
var Service, Characteristic; 		/* For our HAP environment */
var request = require("request"); 	/* Include the request */

/* PREPARATION + CALLING THE PLUGIN */
module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-qsesame", "QSesame", QSesame);
}


/* THE MAIN PLUGIN FUNCTION */
function QSesame(log, config) {
	// Populate our member variables
	self = this;
	this.log = log;
	this.name = config["name"];
	this.username = config["username"];
	this.password = config["password"];
	this.url = "https://api.candyhouse.co/v1/";
	this.token = false;
	this.lockID = false;
	this.headers = { 
		'Content-Type' : 'application/json' 
	};

	// Login to API, get the list of Sesames and set the lockID
	this.apiLogin();
	
	// Create the new lockService for HAP
	this.lockService = new Service.LockMechanism(this.name);

	this.lockService
		.getCharacteristic(Characteristic.LockCurrentState)
		.on('get', this.getState.bind(this));

	this.lockService
		.getCharacteristic(Characteristic.LockTargetState)
		.on('get', this.getState.bind(this))
		.on('set', this.setState.bind(this));

	// Create the new batteryService for HAP
	this.batteryService = new Service.BatteryService(this.name);

	this.batteryService
		.getCharacteristic(Characteristic.BatteryLevel)
		.on('get', this.getBattery.bind(this));

	this.batteryService
		.getCharacteristic(Characteristic.StatusLowBattery)
		.on('get', this.getLowBattery.bind(this));

	// Create the new informationService for HAP
	this.informationService = new Service.AccessoryInformation();

		this.informationService
				.setCharacteristic(Characteristic.Manufacturer, "CANDY HOUSE")
				.setCharacteristic(Characteristic.Model, "Sesame");
}


/* AUThENTICATE ON CANDY HOUSE API */
QSesame.prototype.apiLogin = function() {
		self.log("Attempting to login to CANDY HOUSE..."); 
	request({
			method: "POST",
			json: true,
		url: self.url + "accounts/login",
		headers: self.headers,
		body: { 	
			"email": self.username, 
			"password": self.password 
		}
	}, function(err, response, body) {
			if (!err && response.statusCode == 200) {
				self.log("Logged in as " + self.username + "...");
				self.token = body.authorization;
				// Update header to include token
				self.headers = { 
						'X-Authorization': self.token,
						'Content-Type' : 'application/json' 
					};
				self.listSesames(self.setLockID);
			} else {
				self.log("Error '%s' logging into CANDY HOUSE. Response: %s", err, body);
			}	
	});
}


/* GET ALL THE SESAMES */
QSesame.prototype.listSesames = function(callback) {
		self.log("Getting the list of Sesames from API..."); 
		request.get({
			url: self.url + "sesames",
		headers: self.headers
	}, function(err, response, body) {    
		if (!err && response.statusCode == 200) {
				var json = JSON.parse(body);
			self.log("Got a Sesames JSON from CANDY HOUSE!"); 	
				callback(null, json); 
		} else {
				self.log("Error getting Sesames (status code %s): %s", response.statusCode, err);
			callback(err);
		}
	});
}


/* SELECT A SESAME */
QSesame.prototype.setLockID = function(err, json) {
	if (err == null) {
		json.sesames.forEach(function(sesame) {
			self.log("Found '" + sesame.nickname + "' with device_id " + sesame.device_id + "..."); 	
			if (sesame.nickname == self.name) {
				self.lockID = sesame.device_id;
				self.informationService.setCharacteristic(Characteristic.SerialNumber, self.lockID);
				self.log("That's the one! Set the lockID..."); 	
				self.log("QSesame is ready to LOCK your world..."); 	
			}
		});
		if (self.lockID == false) {
			self.log("Couldn't find '" + self.name + "'..."); 	
		}
	} else {
		self.log("Can't proceed because setLockID received an error..."); 	
	}
}


/* GET THE STATE FROM THE API */
QSesame.prototype.getState = function(callback) {
		self.log("Getting current state..."); 
	if (self.lockID == false) {
		return;
	}
		request.get({
			url: self.url + "sesames/" + self.lockID,
		headers: self.headers
		}, function(err, response, body) {    
			if (!err && response.statusCode == 200) {
					var json = JSON.parse(body);
			// API returns "is_unlocked" as true or false
					var state = json.is_unlocked;
			// HAP and HomeKit work based on "locked" so we'll convert
				var locked = state;
					self.log("Lock state is %s", locked);
					callback(null, locked);
			} else {
				self.log("Error getting state (status code %s): %s", response.statusCode, err);
					callback(err);
			}
		}.bind(self));
}


/* CONTROL THE STATE OF THE SESAME */
QSesame.prototype.setState = function(state, callback) {
	if (self.lockID == false) {
		return;
	}
	
		var lockState = (state == Characteristic.LockTargetState.SECURED) ? "lock" : "unlock";

		self.log("Set state to %s", lockState);

	var controlURL = self.url + "sesames/" + self.lockID + "/control"

		self.log(controlURL);
		self.log(lockState);

	request({
		method: "POST",
		json: true,
		url: controlURL,
		headers: self.headers,
		body: { "type": lockState }
	}, function(err, response, body) {
		if (!err && response.statusCode == 204) {
			self.log("State change complete.");

				// Looks like we're good. The Sesame API does not send content with the response
				var currentState = (state == Characteristic.LockTargetState.SECURED) ?
				Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;

				self.lockService
				.setCharacteristic(Characteristic.LockCurrentState, currentState);

			callback(null);
		} else {
			if(response.statusCode == 400) {
				if(response.body.code == 32000) {
					self.log("CloudAPINotEnabled: Need to go into sesame app and enable 'Cloud Integration'");
				} else {
					self.log("Sesame API returned a bad request status with Sesame api error code: " + response.body.code);
					self.log("Look up what it means at: https://docs.candyhouse.co/#errors");
				}
			} else {
				self.log("Sesame api returned http status: " + response.statusCode + " and Sesame api error code: " + response.body.code);
				self.log("Look up what it means at: https://docs.candyhouse.co/#errors");
			}
			
			callback(err || new Error("Error setting lock state."));
		}
	}.bind(self));
}


/* FETCH BATTERY INFO */
QSesame.prototype.getBattery = function(callback) {
	if (self.lockID == false) {
		return;
	}
	self.log("Getting current battery..."); 
		request.get({
			url: self.url + "sesames/" + self.lockID,
		headers: self.headers
		}, function(err, response, body) {    
			if (!err && response.statusCode == 200) {
					var json = JSON.parse(body);
					var battery = json.battery;
					self.log("Lock battery is %s", battery);
					callback(null, battery); 
			} else {
					self.log("Error getting battery (status code %s): %s", response.statusCode, err);
					callback(err);
			}
	}.bind(self));
}


/* CHECK FOR LOW BATTERY NOTIFICATION */
QSesame.prototype.getLowBattery = function(callback) {
	if (self.lockID == false) {
		return;
	}
	self.log("Getting current battery..."); 
		request.get({
			url: self.url + "sesames/" + self.lockID,
		headers: self.headers
	}, function(err, response, body) {    
			if (!err && response.statusCode == 200) {
					var json = JSON.parse(body);
					var battery = json.battery;
					self.log("Lock battery is %s", battery);
				var low = (battery > 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
					callback(null, low); // success
			} else {
					self.log("Error getting battery (status code %s): %s", response.statusCode, err);
					callback(err);
			}
	}.bind(self));
}


/* FINISH REGISTERING THE SERVICES */
QSesame.prototype.getServices = function() {
	return [self.lockService, self.batteryService, self.informationService];
}
