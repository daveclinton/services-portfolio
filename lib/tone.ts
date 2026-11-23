/** The last idea opened on the home page sets the color of the whole site. */
export const SIGNAL_STORAGE_KEY = "last-signal"
export const TONES = 6

export const toneOf = (index: number) => String(index % TONES)

/** Runs in <head> before the first paint, so a saved color never flashes. */
export const toneScript = `(function(){try{var m=/^#(\\d{2})$/.exec(location.hash);var v=location.pathname==="/"&&m?m[1]:localStorage.getItem("${SIGNAL_STORAGE_KEY}");var n=parseInt(v,10);if(n>=0)document.documentElement.setAttribute("data-tone",String(n%${TONES}))}catch(e){}})()`
