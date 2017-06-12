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
3. NodeJS and NPM installed
4. Homebridge installed (with accessory added to config.json)

# Installation

You can install QSesame via NPM by issuing the following command:
```
sudo npm install -g homebridge-qsesame
```
Then you should update your Homebridge config.json with an accessory entry for each Sesame.
 ```
        {
              "accessory" : "QSesame",
              "name" : "LOCK_NAME",
              "username" : "EMAIL_ADDRESS",
              "password" : "SESAME_PASSWORD"
        }
```
Where LOCK_NAME is the name of your Sesame as it appears in the Sesame app, EMAIL_ADDRESS is the email you use to login, and SESAME_PASSWORD is the password.
