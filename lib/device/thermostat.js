/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
const fakegato = require('./../fakegato/fakegato-history')
const helpers = require('./../helpers')
module.exports = class deviceThermostat {
  constructor (platform, accessory) {
    this.platform = platform
    this.Service = platform.api.hap.Service
    this.Characteristic = platform.api.hap.Characteristic
    this.EveHistoryService = fakegato(platform.api)
    if (!accessory.getService(this.Service.TemperatureSensor)) accessory.addService(this.Service.TemperatureSensor)
    if (accessory.context.sensorType !== 'DS18B20') {
      if (!accessory.getService(this.Service.HumiditySensor)) accessory.addService(this.Service.HumiditySensor)
    }
    if (!this.platform.config.hideTHSwitch) {
      const switchService = accessory.getService(this.Service.Switch) || accessory.addService(this.Service.Switch)
      switchService
        .getCharacteristic(this.Characteristic.On)
        .on('set', (value, callback) => this.internalUpdate(value, callback))
    }
    accessory.log = this.platform.log
    accessory.eveLogger = new this.EveHistoryService('custom', accessory, {
      storage: 'fs',
      path: this.platform.eveLogPath
    })
    this.accessory = accessory
  }

  async internalUpdate (value, callback) {
    callback()
    try {
      const params = {
        switch: value ? 'on' : 'off',
        mainSwitch: value ? 'on' : 'off'
      }
      await this.platform.sendDeviceUpdate(this.accessory, params)
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
    }
  }

  async externalUpdate (params) {
    try {
      if (
        !this.platform.config.hideTHSwitch &&
        (helpers.hasProperty(params, 'switch') || helpers.hasProperty(params, 'mainSwitch'))
      ) {
        const newState = helpers.hasProperty(params, 'switch') ? params.switch === 'on' : params.mainSwitch === 'on'
        const switchService = this.accessory.getService(this.Service.Switch)
        switchService.updateCharacteristic(this.Characteristic.On, newState)
        this.accessory.eveLogger.addEntry({
          time: Math.round(new Date().valueOf() / 1000),
          status: newState ? 1 : 0
        })
      }
      const eveLog = { time: Math.round(new Date().valueOf() / 1000) }
      if (helpers.hasProperty(params, 'currentTemperature') && this.accessory.getService(this.Service.TemperatureSensor)) {
        const currentTemp = parseFloat(params.currentTemperature !== 'unavailable' ? params.currentTemperature : 0)
        this.accessory
          .getService(this.Service.TemperatureSensor)
          .updateCharacteristic(this.Characteristic.CurrentTemperature, currentTemp)
        eveLog.temp = currentTemp
      }
      if (helpers.hasProperty(params, 'currentHumidity') && this.accessory.getService(this.Service.HumiditySensor)) {
        const currentHumi = parseFloat(params.currentHumidity !== 'unavailable' ? params.currentHumidity : 0)
        this.accessory
          .getService(this.Service.HumiditySensor)
          .updateCharacteristic(this.Characteristic.CurrentRelativeHumidity, currentHumi)
        eveLog.humidity = currentHumi
      }
      if (helpers.hasProperty(eveLog, 'temp') || helpers.hasProperty(eveLog, 'humidity')) {
        this.accessory.eveLogger.addEntry(eveLog)
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}
