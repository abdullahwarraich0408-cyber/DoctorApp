/**
 * Work around Windows paths with spaces: CMake invokes CLANG_~1.EXE instead of
 * clang++.exe, so libc++ is not linked automatically. Force c++_shared in native modules.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'node_modules');

const patches = [
  {
    file: 'react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    needle: '        reactnative                         # prefab ready\n)',
    insert: '        reactnative                         # prefab ready\n        c++_shared\n)',
  },
  {
    file: 'react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    needle:
      '        foreach(autolinked_library ${AUTOLINKED_LIBRARIES})\n            target_link_libraries(${autolinked_library} common_flags)\n        endforeach()',
    insert:
      '        foreach(autolinked_library ${AUTOLINKED_LIBRARIES})\n            target_link_libraries(${autolinked_library} common_flags c++_shared)\n        endforeach()',
  },
  {
    file: 'react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
    needle: '          fbjni\n          jsi\n          reactnative\n  )',
    insert: '          fbjni\n          jsi\n          reactnative\n          c++_shared\n  )',
  },
  {
    file: 'react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
    needle: '          fbjni::fbjni\n  )',
    insert: '          fbjni::fbjni\n          c++_shared\n  )',
  },
  {
    file: 'react-native-worklets/android/CMakeLists.txt',
    needle: 'ReactAndroid::jsi fbjni::fbjni)',
    insert: 'ReactAndroid::jsi fbjni::fbjni c++_shared)',
  },
  {
    file: 'react-native-reanimated/android/CMakeLists.txt',
    needle: '  android\n  react-native-worklets::worklets)',
    insert: '  android\n  c++_shared\n  react-native-worklets::worklets)',
  },
  {
    file: 'react-native-screens/android/CMakeLists.txt',
    needle: '    android\n)',
    insert: '    android\n    c++_shared\n)',
  },
  {
    file: 'react-native-screens/android/src/main/jni/CMakeLists.txt',
    needle: '  fbjni::fbjni\n)',
    insert: '  fbjni::fbjni\n  c++_shared\n)',
  },
  {
    file: 'react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
    needle: '  fbjni::fbjni\n)',
    insert: '  fbjni::fbjni\n  c++_shared\n)',
  },
  {
    file: 'react-native-gesture-handler/android/CMakeLists.txt',
    needle: '  reactnative\n)',
    insert: '  reactnative\n  c++_shared\n)',
  },
];

for (const { file, needle, insert } of patches) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    continue;
  }

  const contents = fs.readFileSync(target, 'utf8');
  if (contents.includes(insert)) {
    continue;
  }
  if (!contents.includes(needle)) {
    // Already patched with an older variant, or package layout changed.
    if (contents.includes('c++_shared')) {
      continue;
    }
    console.warn(`[patch-android-cpp-link] Skipped ${file}: pattern not found`);
    continue;
  }

  fs.writeFileSync(target, contents.replace(needle, insert));
  console.log(`[patch-android-cpp-link] Patched ${file}`);
}
