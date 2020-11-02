/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
const helpers = require('./../helpers')
module.exports = class deviceLightMulti {
  constructor (platform, accessory) {
    this.platform = platform
    this.Service = platform.api.hap.Service
    this.Characteristic = platform.api.hap.Characteristic
    const lightService = accessory.getService(this.Service.Lightbulb) || accessory.addService(this.Service.Lightbulb)
    lightService
      .getCharacteristic(this.Characteristic.On)
      .on('set', (value, callback) => this.internalUpdate(value, callback))
    this.accessory = accessory
  }

  async internalUpdate (value, callback) {
    callback()
    try {
      let oAccessory
      const params = {}
      switch (this.accessory.context.switchNumber) {
        case '0':
          params.switches = helpers.defaultMultiSwitchOff
          params.switches[0].switch = value ? 'on' : 'off'
          params.switches[1].switch = value ? 'on' : 'off'
          params.switches[2].switch = value ? 'on' : 'off'
          params.switches[3].switch = value ? 'on' : 'off'
          break
        case '1':
        case '2':
        case '3':
        case '4':
          params.switches = helpers.defaultMultiSwitchOff
          for (let i = 1; i <= 4; i++) {
            if ((oAccessory = this.platform.devicesInHB.get(this.accessory.context.eweDeviceId + 'SW' + i))) {
              if (i === parseInt(this.accessory.context.switchNumber)) {
                params.switches[i - 1].switch = value ? 'on' : 'off'
              } else {
                params.switches[i - 1].switch = oAccessory.context.cacheOn ? 'on' : 'off'
              }
            } else {
              params.switches[i - 1].switch = 'off'
            }
          }
          break
      }
      await this.platform.sendDeviceUpdate(this.accessory, params)
      switch (this.accessory.context.switchNumber) {
        case '0':
          for (let i = 0; i <= 4; i++) {
            if ((oAccessory = this.platform.devicesInHB.get(this.accessory.context.eweDeviceId + 'SW' + i))) {
              oAccessory.getService(this.Service.Lightbulb).updateCharacteristic(this.Characteristic.On, value)
            }
          }
          break
        case '1':
        case '2':
        case '3':
        case '4': {
          let masterState = 'off'
          for (let i = 1; i <= 4; i++) {
            if ((oAccessory = this.platform.devicesInHB.get(this.accessory.context.eweDeviceId + 'SW' + i))) {
              if (oAccessory.getService(this.Service.Lightbulb).getCharacteristic(this.Characteristic.On).value) {
                masterState = 'on'
              }
            }
          }
          if (!this.platform.hiddenMasters.includes(this.accessory.context.eweDeviceId)) {
            oAccessory = this.platform.devicesInHB.get(this.accessory.context.eweDeviceId + 'SW0')
            oAccessory.getService(this.Service.Lightbulb).updateCharacteristic(this.Characteristic.On, masterState === 'on')
          }
          break
        }
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
    }
  }

  async externalUpdate (params) {
    try {
      if (!helpers.hasProperty(params, 'switches')) return
      const idToCheck = this.accessory.context.hbDeviceId.slice(0, -1)
      let primaryState = false
      for (let i = 1; i <= this.accessory.context.channelCount; i++) {
        if (params.switches[i - 1].switch === 'on') {
          primaryState = true
        }
        if (this.platform.devicesInHB.has(idToCheck + i)) {
          const oAccessory = this.platform.devicesInHB.get(idToCheck + i)
          oAccessory.context.cacheOn = params.switches[i - 1].switch === 'on'
          oAccessory
            .getService(this.Service.Lightbulb)
            .updateCharacteristic(this.Characteristic.On, params.switches[i - 1].switch === 'on')
        }
      }
      if (!this.platform.hiddenMasters.includes(this.accessory.context.eweDeviceId)) {
        this.accessory.getService(this.Service.Lightbulb).updateCharacteristic(this.Characteristic.On, primaryState)
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}
