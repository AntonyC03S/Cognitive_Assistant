import { initTopbar } from "/common.js";

(async function init() {
  // allow viewing even if logged out
  await initTopbar({ requireAuth: false });
})();