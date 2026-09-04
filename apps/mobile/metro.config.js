const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro vigila todo el proyecto, y eso incluye los artefactos de compilación
// nativa de Android. CMake replica la ruta absoluta del proyecto dentro de
// android/app/.cxx/.../CMakeFiles/, generando rutas enormes que además se
// crean y borran durante el build: el watcher se cae con ENOENT y tumba el
// servidor. No son código fuente, así que quedan fuera.
config.resolver.blockList = [
  /[\\/]android[\\/]app[\\/]\.cxx[\\/].*/,
  /[\\/]android[\\/]app[\\/]build[\\/].*/,
  /[\\/]android[\\/]build[\\/].*/,
  /[\\/]android[\\/]\.gradle[\\/].*/,
  /[\\/]ios[\\/]build[\\/].*/,
];

module.exports = config;
