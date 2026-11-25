import { MARK } from "@/lib/mark"

/** The last numbered item opened, on any list, sets the color of the whole site. */
export const TONE_STORAGE_KEY = "site-tone"

/** The same six colors as html[data-tone] in app/globals.css. */
export const TONE_COLORS = ["#1557c0", "#17754a", "#b3264a", "#6a3fb5", "#a8480c", "#0d7077"] as const
export const TONES = TONE_COLORS.length

export const toneOf = (index: number) => String(index % TONES)

const { bowl, stem } = MARK
const markShapes = `<circle cx='${bowl.cx}' cy='${bowl.cy}' r='${bowl.r}' fill='white'/><rect x='${stem.x}' y='${stem.y}' width='${stem.width}' height='${stem.height}' fill='white'/>`

/**
 * Runs in <head> before the first paint, so a saved color never flashes. It also
 * keeps the browser tab's icon and the phone's status bar in the site's color.
 */
export const toneScript = `(function(){try{
var d=document,h=d.documentElement,c=${JSON.stringify(TONE_COLORS)};
var m=/^#(\\d{2})$/.exec(location.hash),n=NaN;
try{n=parseInt(m?m[1]:localStorage.getItem("${TONE_STORAGE_KEY}"),10)}catch(e){}
if(/^\\/admin(?:\\/|$)/.test(location.pathname))h.removeAttribute("data-tone");
else if(n>=0)h.setAttribute("data-tone",String(n%${TONES}));
var icon=d.createElement("link");icon.rel="icon";icon.type="image/svg+xml";icon.setAttribute("sizes","any");
/* Moving to another page adds the default icon and color again. */
function start(){paint();new MutationObserver(paint).observe(d.head,{childList:true})}
function paint(){var t=c[h.getAttribute("data-tone")]||c[0];
icon.href="data:image/svg+xml,"+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='"+t+"'/>${markShapes}</svg>");
last();
var theme=h.hasAttribute("data-tone")?t:getComputedStyle(d.body||h).backgroundColor;
d.querySelectorAll("meta[name=theme-color]").forEach(function(e){if(e.content!==theme)e.setAttribute("content",theme)})}
function last(){var a=d.querySelectorAll("link[rel=icon]");if(a[a.length-1]!==icon)d.head.appendChild(icon)}
new MutationObserver(paint).observe(h,{attributes:true,attributeFilter:["data-tone"]});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start);else start();
}catch(e){}})()`
