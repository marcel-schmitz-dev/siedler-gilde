// Kopiert das Browser-Bundle von supabase-js nach js/vendor/,
// damit die Seite die Bibliothek selbst ausliefert (keine Anfrage an einen fremden CDN-Server).
// Aufruf: npm run vendor  (nach jedem Update von @supabase/supabase-js wiederholen)
const fs = require("fs");

fs.mkdirSync("js/vendor", { recursive: true });
fs.copyFileSync("node_modules/@supabase/supabase-js/dist/umd/supabase.js", "js/vendor/supabase.js");

console.log("js/vendor/supabase.js aktualisiert");
