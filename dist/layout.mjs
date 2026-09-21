// Layouts travel as JSON. Every exported TMX carries the same JSON in a map
// property, so a Farm.tmx made by this editor can be opened again later.
import {validate,normalized} from './core.mjs';
import {t} from './i18n.mjs';
export const LAYOUT_PROPERTY='FarmN/Layout';
const entities={quot:'"',apos:"'",lt:'<',gt:'>',amp:'&'};
const unescapeXml=s=>s.replace(/&(?:(quot|apos|lt|gt|amp)|#(\d+)|#x([0-9a-fA-F]+));/g,(m,name,dec,hex)=>name?entities[name]:String.fromCodePoint(parseInt(dec||hex,dec?10:16)));
export function layoutFromTmx(xml){
 const match=xml.match(/<property\s+name="FarmN\/Layout"(?:\s+type="string")?\s+value="([^"]*)"/);
 if(!match)throw Error(t('layout.noLayoutInTmx'));
 return JSON.parse(unescapeXml(match[1]));
}
export function parseLayout(text){
 let data;
 try{data=/^\s*</.test(text.slice(0,256))?layoutFromTmx(text):JSON.parse(text);}
 catch(error){if(error instanceof SyntaxError)throw Error(t('layout.invalid'));throw error;}
 // Accept the browser autosave shape as well as a bare layout.
 if(data&&typeof data==='object'&&data.config&&!data.Positions)data=data.config;
 const errors=validate(data);if(errors.length)throw Error(errors[0]);
 return normalized(data);
}
export function layoutJson(config){return JSON.stringify(normalized(config),null,2);}
