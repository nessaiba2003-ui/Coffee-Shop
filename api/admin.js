// Static entry point for Vercel. The rewrite in vercel.json supplies the
// requested admin route through ?path=admin/... before delegating here.
module.exports = require("./[...path].js");
