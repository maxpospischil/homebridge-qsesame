# QSesame

QSesame is a [Homebridge plugin](https://github.com/nfarina/homebridge) that allows you to control [Sesame smart locks](https://candyhouse.co) with Siri by integrating with HomeKit.

Currently these features are supported:

 * _Lock the Sesame_
 * _Unlock the Sesame_
 * _Check the current state_ 
 * _Check the battery level_
 * _Battery low warning_

In order to use QSesame you must have: 

1. A Sesame smart lock with API access enabled
2. The Vritual Station app or WiFi Access Point
3. Nodejs and npm installed
4. Homebridge installed (with accessory added to config.json)

__Example of config.json entry__
 ```
        {
              "accessory" : "QSesame",
              "name" : "LOCK_NAME",
			        "username" : "EMAIL_ADDRESS",
			        "password" : "SESAME_PASSWORD"
        }
```

