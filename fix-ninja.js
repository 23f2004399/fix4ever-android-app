const fs = require('fs');
const path = require('path');
function walk(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.lstatSync(full).isDirectory()) {
        walk(full);
      } else if (f === 'react-native-workletsConfig.cmake') {
        const target = path.join(dir, 'react-native-workletsConfigVersion.cmake');
        if (!fs.existsSync(target)) {
          fs.writeFileSync(target, 'set(PACKAGE_VERSION "1.0.0")');
          console.log('Created: ' + target);
        }
      }
    }
  } catch(e) {}
}
walk('D:\\Extra Projects\\fix4ever-app\\fix4ever-android-app\\node_modules\\react-native-reanimated\\android');
