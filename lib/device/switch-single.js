/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
const fakegato = require('./../fakegato/fakegato-history')
const helpers = require('./../helpers')
module.exports = class deviceSwitchSingle {
  constructor (platform, accessory) {
    this.platform = platform
    this.Service = platform.api.hap.Service
    this.Characteristic = platform.api.hap.Characteristic
    this.EveHistoryService = fakegato(platform.api)
    this.switchService = accessory.getService(this.Service.Switch) || accessory.addService(this.Service.Switch)
    this.switchService
      .getCharacteristic(this.Characteristic.On)
      .on('set', this.internalUpdate.bind(this))
    if (accessory.getService(this.Service.Outlet)) {
      accessory.removeService(accessory.getService(this.Service.Outlet))
    }
    if (accessory.getService(this.Service.Lightbulb)) {
      accessory.removeService(accessory.getService(this.Service.Lightbulb))
    }
    accessory.log = this.platform.log
    accessory.eveLogger = new this.EveHistoryService('switch', accessory, {
      storage: 'fs',
      path: this.platform.eveLogPath
    })
    this.accessory = accessory
  }

  async internalUpdate (value, callback) {
    try {
      await helpers.sleep(Math.floor(Math.random() * 741 + 10))
      callback()
      const params = { switch: value ? 'on' : 'off' }
      await this.platform.sendDeviceUpdate(this.accessory, params)
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
    }
  }

  async externalUpdate (params) {
    try {
      if (!helpers.hasProperty(params, 'switch')) return
      this.switchService.updateCharacteristic(this.Characteristic.On, params.switch === 'on')
      this.accessory.eveLogger.addEntry({
        time: Math.round(new Date().valueOf() / 1000),
        status: params.switch === 'on' ? 1 : 0
      })
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}
