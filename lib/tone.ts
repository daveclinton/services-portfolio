/** The last numbered item opened, on any list, sets the color of the whole site. */
export const TONE_STORAGE_KEY = "site-tone"
export const TONES = 6

export const toneOf = (index: number) => String(index % TONES)

/** Runs in <head> before the first paint, so a saved color never flashes. */
export const toneScript = `(function(){try{var m=/^#(\\d{2})$/.exec(location.hash);var n=parseInt(m?m[1]:localStorage.getItem("${TONE_STORAGE_KEY}"),10);if(n>=0)document.documentElement.setAttribute("data-tone",String(n%${TONES}))}catch(e){}})()`
