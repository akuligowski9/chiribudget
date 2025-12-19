export function getDemoMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("chiribudget_demoMode") === "true";
}

export function setDemoMode(v) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("chiribudget_demoMode", v ? "true" : "false");
}
