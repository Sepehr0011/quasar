const fs = require('node:fs')
const fse = require('fs-extra')
const inquirer = require('inquirer')

const { log, warn, fatal } = require('../../utils/logger.js')
const { spawnSync } = require('../../utils/spawn.js')
const { ensureWWW, ensureConsistency } = require('./ensure-consistency.js')

function isModeInstalled (appPaths) {
  return fs.existsSync(appPaths.cordovaDir)
}
module.exports.isModeInstalled = isModeInstalled

module.exports.addMode = async function addMode ({
  ctx: { appPaths, pkg: { appPkg } },
  silent,
  target
}) {
  if (isModeInstalled(appPaths)) {
    if (target) {
      addPlatform(appPaths, target)
    }
    else if (silent !== true) {
      warn('Cordova support detected already. Aborting.')
    }

    return
  }

  const appName = appPkg.productName || appPkg.name || 'Quasar App'

  if (/^[0-9]/.test(appName)) {
    warn(
      'App product name cannot start with a number. '
      + 'Please change the "productName" prop in your /package.json then try again.'
    )
    return
  }

  console.log()
  const answer = await inquirer.prompt([ {
    name: 'appId',
    type: 'input',
    message: 'What is the Cordova app id?',
    default: 'org.cordova.quasar.app',
    validate: appId => (appId ? true : 'Please fill in a value')
  } ])

  log('Creating Cordova source folder...')

  spawnSync(
    'cordova',
    [ 'create', 'src-cordova', answer.appId, appName ],
    { cwd: appPaths.appDir },
    () => {
      fatal('There was an error trying to install Cordova support')
    }
  )

  ensureWWW({ appPaths, forced: true })

  log('Cordova support was installed')
  log(`App name was taken from package.json: "${ appName }"`)
  log()
  warn('If you want a different App name then remove Cordova support, edit productName field from package.json then add Cordova support again.')
  warn()

  console.log(' ⚠️  WARNING!')
  console.log(' ⚠️  If developing for iOS, it is HIGHLY recommended that you install the Ionic Webview Plugin.')
  console.log(' ⚠️  Please refer to docs: https://quasar.dev/quasar-cli/developing-cordova-apps/preparation')
  console.log(' ⚠️  --------')
  console.log()

  if (!target) {
    console.log()
    console.log(' No Cordova platform has been added yet as these get installed on demand automatically when running "quasar dev" or "quasar build".')
    log()
    return
  }

  addPlatform(appPaths, target)
}

module.exports.removeMode = function removeMode ({
  ctx: { appPaths }
}) {
  if (!isModeInstalled(appPaths)) {
    warn('No Cordova support detected. Aborting.')
    return
  }

  fse.removeSync(appPaths.cordovaDir)
  log('Cordova support was removed')
}

function addPlatform (appPaths, target) {
  ensureConsistency({ appPaths })

  // if it has the platform
  if (fs.existsSync(appPaths.resolve.cordova(`platforms/${ target }`))) {
    return
  }

  log(`Adding Cordova platform "${ target }"`)
  spawnSync(
    'cordova',
    [ 'platform', 'add', target ],
    { cwd: appPaths.cordovaDir },
    () => {
      warn(`There was an error trying to install Cordova platform "${ target }"`)
      process.exit(1)
    }
  )
}
