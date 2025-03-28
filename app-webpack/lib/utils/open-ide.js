const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')
const open = require('open')

const { warn, fatal } = require('./logger.js')

function findXcodeWorkspace (folder) {
  const root = fs.readdirSync(folder)

  for (const item of root) {
    const __path = path.join(folder, item)

    if (item.endsWith('.xcworkspace')) {
      return __path
    }
  }
}

function runMacOS (mode, target, appPaths) {
  if (target === 'ios') {
    const folder = mode === 'cordova'
      ? appPaths.resolve.cordova('platforms/ios')
      : appPaths.resolve.capacitor('ios/App')

    open(findXcodeWorkspace(folder), {
      wait: false
    })
  }
  else {
    const folder = mode === 'cordova'
      ? appPaths.resolve.cordova('platforms/android')
      : appPaths.resolve.capacitor('android')

    open(folder, {
      app: { name: 'android studio' },
      wait: false
    })
  }
}

function getLinuxPath (bin) {
  const canonicalPaths = [
    '/usr/local/android-studio/bin/studio.sh',
    '/opt/android-studio/bin/studio.sh'
  ]

  if (process.env.ANDROID_STUDIO_PATH) {
    canonicalPaths.push(process.env.ANDROID_STUDIO_PATH)
  }

  if (bin.linuxAndroidStudio) {
    canonicalPaths.unshift(bin.linuxAndroidStudio)
  }

  for (const studioPath of canonicalPaths) {
    if (fs.existsSync(studioPath)) {
      return studioPath
    }
  }
}

function runLinux (mode, bin, target, appPaths) {
  if (target === 'android') {
    const studioPath = getLinuxPath(bin)
    if (studioPath) {
      const folder = mode === 'cordova'
        ? appPaths.resolve.cordova('platforms/android')
        : appPaths.resolve.capacitor('android')

      open(folder, {
        app: { name: studioPath },
        wait: false
      })

      return
    }
  }
  else if (target === 'ios') {
    fatal('iOS target not supported on Linux')
  }

  warn('Cannot determine path to IDE executable')
  console.log(' Please set quasar.config file > bin > linuxAndroidStudio with the escaped path to your studio.sh')
  console.log(' Example: \'/usr/local/android-studio/bin/studio.sh\'')
  process.exit(1)
}

function getWindowsPath (bin) {
  if (bin.windowsAndroidStudio && fs.existsSync(bin.windowsAndroidStudio)) {
    return bin.windowsAndroidStudio
  }

  const studioPath = 'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe'
  if (fs.existsSync(studioPath)) {
    return studioPath
  }

  try {
    const buffer = execSync('REG QUERY "HKEY_LOCAL_MACHINE\\SOFTWARE\\Android Studio" /v Path')
    const bufferString = buffer.toString('utf-8').replace(/(\r\n|\n|\r)/gm, '')
    const index = bufferString.indexOf('REG_SZ')

    if (index > 0) {
      const asPath = bufferString.substring(index + 6).trim() + '\\bin\\studio64.exe'
      if (fs.existsSync(asPath)) {
        return asPath
      }
    }
  }
  catch (_) {
    /* do and return nothing */
  }
}

function runWindows (mode, bin, target, appPaths) {
  if (target === 'android') {
    const studioPath = getWindowsPath(bin)
    if (studioPath) {
      const folder = mode === 'cordova'
        ? appPaths.resolve.cordova('platforms/android')
        : appPaths.resolve.capacitor('android')

      open(folder, {
        app: { name: studioPath },
        wait: false
      })

      // pause required, otherwise Windows fails
      // to open the process
      return new Promise(resolve => {
        setTimeout(resolve, 300)
      })
    }
  }
  else if (target === 'ios') {
    fatal('iOS target not supported on Windows')
  }

  warn('Cannot determine path to IDE executable')
  console.log(' Please set quasar.config file > bin > windowsAndroidStudio with the escaped path to your studio64.exe')
  console.log(' Example: \'C:\\\\Program Files\\\\Android\\\\Android Studio\\\\bin\\\\studio64.exe\'')
  process.exit(1)
}

module.exports.openIDE = function openIDE ({ mode, bin, target, dev, appPaths }) {
  console.log()
  console.log(' ⚠️  ')
  console.log(` ⚠️  Opening ${ target === 'ios' ? 'XCode' : 'Android Studio' } IDE...`)

  if (dev) {
    console.log(' ⚠️  From there, use the IDE to run the app.')
    console.log(' ⚠️  ')
    console.log(' ⚠️  DO NOT close the terminal as this will kill the devserver.')
  }
  else {
    console.log(' ⚠️  From there, use the IDE to build the final package.')
  }

  if (target === 'android') {
    console.log(' ⚠️  ')
    console.log(' ⚠️  DO NOT upgrade Gradle or any other deps if Android Studio will suggest.')
    console.log(' ⚠️  If you encounter any IDE errors then click on File > Invalidate caches and restart.')
  }

  console.log(' ⚠️  ')
  console.log()

  switch (process.platform) {
    case 'darwin':
      return runMacOS(mode, target, appPaths)
    case 'linux':
      return runLinux(mode, bin, target, appPaths)
    case 'win32':
      return runWindows(mode, bin, target, appPaths)
    default:
      fatal('Unsupported host OS for opening the IDE')
  }
}
