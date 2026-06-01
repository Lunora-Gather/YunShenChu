const fs = require('fs');

const appPath = 'C:\\Users\\24377\\Desktop\\Wonderful\\YunShenChu\\SkyCity\\src\\App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

// Fix Sidebar conditional rendering
appCode = appCode.replace(
  '      {/* Sidebar */}\n      <aside className="sidebar">',
  '      {/* Sidebar */}\n      {!isUIHidden && (\n        <aside className="sidebar fade-in">'
);

// Fix District Detail conditional rendering
appCode = appCode.replace(
  '        <section className="district-detail glass-panel">',
  '        {!isUIHidden && (\n          <section className="district-detail glass-panel fade-in">'
);

// Fix duplicated closing logic if any
// We expect a single export default App; at the end
const appExportCount = (appCode.match(/export default App;/g) || []).length;
if (appExportCount > 1) {
    appCode = appCode.replace(/export default App;[\s\S]*/, 'export default App;\n');
}

fs.writeFileSync(appPath, appCode);

const audioPath = 'C:\\Users\\24377\\Desktop\\Wonderful\\YunShenChu\\SkyCity\\src\\components\\AudioEngine\\AudioEngine.tsx';
let audioCode = fs.readFileSync(audioPath, 'utf8');
audioCode = audioCode.replace(/export default AudioEngine;[\s\S]*/, 'export default AudioEngine;\n');
fs.writeFileSync(audioPath, audioCode);
