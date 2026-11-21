// De offerte in twee talen. De drie renderplekken (modal, PDF, ondertekenpagina)
// halen hun tekst uit hetzelfde blok; deze test bewaakt dat de twee talen
// gelijk blijven lopen en dat niemand per ongeluk werk kwijtraakt.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const bron = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'offertetaal.js'), 'utf8');
const a = bron.indexOf('// <offertetaal>'), b = bron.indexOf('// </offertetaal>');
assert(a > 0 && b > a, 'offertetaalblok niet gevonden');
const blok = bron.slice(a, b);
assert(!/:\s*(any|string|number|boolean)\b/.test(blok), 'blok bevat types; node kan het dan niet draaien');
const F = new Function(blok + '\nreturn { OFFERTE_TALEN, OFFERTE_TEKST, OFFERTE_VOORWAARDEN, offerteTaal, offerteTekst, offerteVoorwaarden, magVoorwaardenVervangen, offerteBedrag, offerteDatum, offerteVoorwaardenLijst, offerteOpties, offerteHeeftOpties, offerteGroepen, offerteBedragen, offerteVergelijkBedrag, offerteGevuldeRegels };')();

/* ---------- de twee talen lopen gelijk ---------- */
// Dit is de belangrijkste toets. Voeg je een label toe in het Nederlands en
// vergeet je het Engels, dan staat er straks `undefined` in een document dat een
// klant ondertekent.
const nlSleutels = Object.keys(F.OFFERTE_TEKST.nl).sort();
const enSleutels = Object.keys(F.OFFERTE_TEKST.en).sort();
assert.deepStrictEqual(enSleutels, nlSleutels, 'de talen hebben niet dezelfde labels');
nlSleutels.forEach(k => {
    assert.strictEqual(typeof F.OFFERTE_TEKST.en[k], 'string', k + ' is in het Engels geen tekst');
    assert(F.OFFERTE_TEKST.en[k].trim().length > 0, k + ' is leeg in het Engels');
    assert(F.OFFERTE_TEKST.nl[k].trim().length > 0, k + ' is leeg in het Nederlands');
});

// Elk label moet echt vertaald zijn en niet blijven staan. Een handvol woorden
// is in beide talen hetzelfde; die staan hier met naam, zodat een vergeten
// vertaling opvalt en een bewuste gelijkenis niet.
const MAG_GELIJK = ['btw', 'kort', 'locale', 'htmlLang', 'label'];
nlSleutels.forEach(k => {
    if (MAG_GELIJK.indexOf(k) !== -1) return;
    assert.notStrictEqual(F.OFFERTE_TEKST.en[k], F.OFFERTE_TEKST.nl[k],
        'label "' + k + '" is in beide talen gelijk; vergeten te vertalen?');
});

/* ---------- de voorwaarden ---------- */
// Evenveel bullets: mist er een, dan belooft de ene taal iets anders dan de
// andere, en dat is bij voorwaarden geen schoonheidsfoutje.
const tel = t => F.OFFERTE_VOORWAARDEN[t].split('•').length - 1;
assert.strictEqual(tel('en'), tel('nl'),
    'de talen hebben niet evenveel voorwaarden: nl ' + tel('nl') + ', en ' + tel('en'));
assert.strictEqual(tel('nl'), 9);
// Het uurtarief en de betaaltermijn moeten in beide talen hetzelfde zijn.
['€90', '14', '3'].forEach(s => {
    assert(F.OFFERTE_VOORWAARDEN.nl.includes(s), 'nl mist ' + s);
    assert(F.OFFERTE_VOORWAARDEN.en.includes(s), 'en mist ' + s);
});
// Nederlands recht blijft gelden, ook in de Engelse versie. Dat is een
// inhoudelijke keuze en geen vertaalfout.
assert(/Dutch law/i.test(F.OFFERTE_VOORWAARDEN.en), 'de Engelse voorwaarden noemen Nederlands recht niet');

/* ---------- een onbekende taal valt terug ---------- */
assert.strictEqual(F.offerteTaal('nl'), 'nl');
assert.strictEqual(F.offerteTaal('en'), 'en');
assert.strictEqual(F.offerteTaal(null), 'nl', 'geen taal is Nederlands');
assert.strictEqual(F.offerteTaal(undefined), 'nl', 'een oude offerte zonder taalveld');
assert.strictEqual(F.offerteTaal('de'), 'nl', 'onbekende taal liever verkeerd dan undefined');
assert.strictEqual(F.offerteTaal(''), 'nl');
assert.strictEqual(F.offerteTekst('de').offerte, 'Offerte');

/* ---------- mogen de voorwaarden bij het wisselen vervangen worden ---------- */
// Leeg of onaangeroerd: ja. Zelf aangepast: nee, want dat werk is nergens
// anders bewaard.
assert.strictEqual(F.magVoorwaardenVervangen(''), true);
assert.strictEqual(F.magVoorwaardenVervangen('   '), true);
assert.strictEqual(F.magVoorwaardenVervangen(null), true);
assert.strictEqual(F.magVoorwaardenVervangen(F.OFFERTE_VOORWAARDEN.nl), true, 'standaard NL mag weg');
assert.strictEqual(F.magVoorwaardenVervangen(F.OFFERTE_VOORWAARDEN.en), true, 'standaard EN mag weg');
assert.strictEqual(F.magVoorwaardenVervangen('\n' + F.OFFERTE_VOORWAARDEN.nl + '\n'), true,
    'witruimte eromheen telt niet als een wijziging');
assert.strictEqual(F.magVoorwaardenVervangen(F.OFFERTE_VOORWAARDEN.nl + '\n• En nog iets.'), false,
    'een toegevoegde bullet is eigen werk');
assert.strictEqual(F.magVoorwaardenVervangen('Eigen afspraken met deze klant.'), false);

/* ---------- geld en datum volgen de taal ---------- */
// De munt blijft euro; alleen de schrijfwijze verschilt. Een Engelse offerte
// met "1.234,56" leest voor een Britse ontvanger als iets heel anders.
const nlBedrag = F.offerteBedrag(1234.5, 'nl');
const enBedrag = F.offerteBedrag(1234.5, 'en');
assert(nlBedrag.includes('€') && enBedrag.includes('€'), 'beide in euro');
assert.notStrictEqual(nlBedrag, enBedrag, 'de schrijfwijze hoort te verschillen');
assert(/1\.234,50/.test(nlBedrag), 'nl schrijft punt als duizendtal: ' + nlBedrag);
assert(/1,234\.50/.test(enBedrag), 'en schrijft komma als duizendtal: ' + enBedrag);
assert.strictEqual(F.offerteBedrag(null, 'nl').includes('0'), true, 'leeg is nul, geen NaN');

assert(/september/i.test(F.offerteDatum('2026-09-21', 'nl')), 'nl maandnaam');
assert(/September/.test(F.offerteDatum('2026-09-21', 'en')), 'en maandnaam');
assert.strictEqual(F.offerteDatum(null, 'nl'), '', 'geen datum, geen tekst');
assert.strictEqual(F.offerteDatum('onzin', 'en'), '', 'onleesbare datum geeft niets, geen Invalid Date');

/* ---------- de voorwaarden opdelen in punten ---------- */
// Een echte offerte had veertien zelfgeschreven punten, elk op een eigen
// regel met een streepje ervoor, en geen enkele bullet. De renderer gooide de
// regelovergangen weg en splitste op "•": alles werd EEN bullet met de
// streepjes middenin de lopende tekst.

// De standaardvoorwaarden (bullets, elk op een eigen regel) blijven negen punten.
['nl', 'en'].forEach(t => {
    assert.strictEqual(F.offerteVoorwaardenLijst(F.OFFERTE_VOORWAARDEN[t]).length, 9,
        t + ': de standaardvoorwaarden horen negen punten te geven');
});
// En er blijft geen lijstteken aan het begin plakken.
F.offerteVoorwaardenLijst(F.OFFERTE_VOORWAARDEN.nl).forEach(p => {
    assert(!/^[•\-–—*]/.test(p), 'punt begint nog met een lijstteken: ' + p);
});

// Het geval van 05-10: streepjes op eigen regels, geen enkele bullet.
const streepjes = ['- Eerste punt over de opname.', '- Tweede punt over de levering.', '- Derde punt.'].join('\n');
assert.strictEqual(F.offerteVoorwaardenLijst(streepjes).length, 3,
    'streepjes op eigen regels horen drie punten te geven');
assert.strictEqual(F.offerteVoorwaardenLijst(streepjes)[0], 'Eerste punt over de opname.');

// Zonder enig lijstteken, puur regels.
assert.strictEqual(F.offerteVoorwaardenLijst(['Een.', 'Twee.', 'Drie.'].join('\n')).length, 3,
    'kale regels tellen ook als punten');

// Bullets achter elkaar op EEN regel, zoals het sjabloon ooit kan binnenkomen.
assert.strictEqual(F.offerteVoorwaardenLijst('• Een. • Twee. • Drie.').length, 3,
    'bullets op een regel horen ook te splitsen');

// Door elkaar, want dat gebeurt zodra iemand iets plakt.
assert.strictEqual(F.offerteVoorwaardenLijst(['• Een.', '- Twee.', 'Drie.', '', ''].join('\n')).length, 3,
    'gemengde notatie hoort te werken, lege regels tellen niet mee');

// Windows-regeleindes.
assert.strictEqual(F.offerteVoorwaardenLijst('- Een.\r\n- Twee.').length, 2, 'CRLF telt ook');

// Niets erin is geen punt.
[null, undefined, '', '   ', '\n\n'].forEach(x => {
    assert.strictEqual(F.offerteVoorwaardenLijst(x).length, 0,
        'leeg hoort nul punten te geven: ' + JSON.stringify(x));
});

// Een streepje MIDDEN in een zin mag niet splitsen; alleen vooraan telt.
const metStreepje = '- Levering binnen 5-7 werkdagen na akkoord.';
assert.strictEqual(F.offerteVoorwaardenLijst(metStreepje).length, 1,
    'een streepje in een getal mag niet splitsen');
assert.strictEqual(F.offerteVoorwaardenLijst(metStreepje)[0],
    'Levering binnen 5-7 werkdagen na akkoord.');

/* ---------- opties ---------- */
// De belangrijkste eis: een offerte ZONDER opties mag hier niets van merken.
const losseRegels = [
    { description: 'Setup', qty: 1, unit_price: 500, type: 'eenmalig' },
    { description: 'Beheer', qty: 1, unit_price: 100, type: 'per_maand' }
];
[undefined, null, [], 'onzin', {}].forEach(x => {
    assert.strictEqual(F.offerteOpties({ opties: x }).length, 0, 'geen opties: ' + JSON.stringify(x));
    assert.strictEqual(F.offerteHeeftOpties({ opties: x }), false);
});
assert.strictEqual(F.offerteOpties(null).length, 0, 'geen offerte is geen opties');
assert.strictEqual(F.offerteOpties(undefined).length, 0);

const zonder = F.offerteGroepen(losseRegels, []);
assert.strictEqual(zonder.gedeeld.length, 2, 'zonder opties staat alles in gedeeld');
assert.strictEqual(zonder.groepen.length, 0);

// Met opties: gedeelde regels tellen mee in ELKE optie.
const OPTIES = [{ id: 'o1', naam: 'Starter' }, { id: 'o2', naam: 'Groei' }];
const metOpties = [
    { description: 'Setup', qty: 1, unit_price: 500, type: 'eenmalig' },
    { description: 'Starterpakket', qty: 1, unit_price: 750, type: 'eenmalig', optie: 'o1' },
    { description: 'Groeipakket', qty: 1, unit_price: 1900, type: 'eenmalig', optie: 'o2' },
    { description: 'Beheer groei', qty: 1, unit_price: 200, type: 'per_maand', optie: 'o2' }
];
const g = F.offerteGroepen(metOpties, OPTIES);
assert.strictEqual(g.gedeeld.length, 1, 'alleen de setupregel is gedeeld');
assert.strictEqual(g.groepen.length, 2);
assert.strictEqual(g.groepen[0].eigen.length, 1, 'optie 1 heeft een eigen regel');
assert.strictEqual(g.groepen[0].items.length, 2, 'optie 1 = gedeeld + eigen');
assert.strictEqual(g.groepen[1].items.length, 3, 'optie 2 = gedeeld + twee eigen');
assert.strictEqual(g.groepen[0].naam, 'Starter');

// Een regel die naar een verwijderde optie wijst mag NIET verdwijnen.
const naVerwijderen = F.offerteGroepen(metOpties, [{ id: 'o1', naam: 'Starter' }]);
assert.strictEqual(naVerwijderen.gedeeld.length, 3,
    'regels van een weggehaalde optie worden gedeeld, niet weggegooid');
assert.strictEqual(naVerwijderen.gedeeld.length + naVerwijderen.groepen[0].eigen.length,
    metOpties.length, 'er mag geen regel zoekraken');

// Een optie zonder naam krijgt er een, anders staat er niets boven het blok.
assert.strictEqual(F.offerteGroepen([], [{ id: 'x' }]).groepen[0].naam, 'Optie 1');

/* ---------- bedragen ---------- */
const bg = F.offerteBedragen(g.groepen[1].items, 21);
assert.strictEqual(bg.eenmaligSub, 2400, 'setup 500 + groei 1900');
assert.strictEqual(bg.maandSub, 200);
assert.strictEqual(Math.round(bg.eenmaligBtw), 504);
assert.strictEqual(Math.round(bg.maandTotaal), 242);
// Eenmalig en per maand blijven gescheiden in de btw.
assert.strictEqual(Math.round(bg.btw), Math.round(bg.eenmaligBtw + bg.maandBtw));

// Leeg is nul en geen NaN.
[null, undefined, [], 'x'].forEach(x => {
    const n = F.offerteBedragen(x, 21);
    assert.strictEqual(n.totaal, 0, 'leeg is nul: ' + JSON.stringify(x));
    assert(isFinite(n.totaal), 'geen NaN');
});
// Een ontbrekend btw-tarief valt terug op 21 en niet op nul.
assert.strictEqual(F.offerteBedragen(losseRegels, null).btw, F.offerteBedragen(losseRegels, 21).btw);
assert.strictEqual(F.offerteBedragen(losseRegels, 0).btw, F.offerteBedragen(losseRegels, 21).btw,
    '0 is hier geen geldig tarief; dat zou btw stil laten verdwijnen');

// Een regel zonder type is eenmalig, zoals overal in de offerte.
assert.strictEqual(F.offerteBedragen([{ qty: 2, unit_price: 50 }], 21).eenmaligSub, 100);

/* ---------- welke optie is de goedkoopste ---------- */
// Een maandbedrag weegt twaalf keer mee, anders lijkt een retainer altijd
// goedkoper dan een eenmalig project.
const goedkoop = F.offerteVergelijkBedrag(F.offerteBedragen(g.groepen[0].items, 21));
const duur = F.offerteVergelijkBedrag(F.offerteBedragen(g.groepen[1].items, 21));
assert(goedkoop < duur, 'Starter hoort goedkoper te zijn dan Groei');
assert(F.offerteVergelijkBedrag(F.offerteBedragen([{ qty: 1, unit_price: 100, type: 'per_maand' }], 21))
     > F.offerteVergelijkBedrag(F.offerteBedragen([{ qty: 1, unit_price: 500, type: 'eenmalig' }], 21)),
    'honderd per maand is een jaar lang meer dan vijfhonderd eenmalig');

/* ---------- lege regels horen niet in het document ---------- */
// De placeholder waarmee het formulier begint: geen omschrijving, nul euro.
// Die stond op een echte offerte als "-" in ELKE optie, want hij heeft geen optie en
// telt dus als gedeeld.
const PLACEHOLDER = { description: '', qty: 1, unit_price: 0, type: 'eenmalig', optie: '' };
assert.strictEqual(F.offerteGevuldeRegels([PLACEHOLDER]).length, 0, 'de lege regel valt weg');
assert.strictEqual(F.offerteGevuldeRegels([{ description: '   ', qty: 1, unit_price: 0 }]).length, 0,
    'alleen spaties telt ook als leeg');

// Maar alles wat iets zegt OF iets kost blijft staan.
assert.strictEqual(F.offerteGevuldeRegels([{ description: 'Kickoff, kosteloos', qty: 1, unit_price: 0 }]).length, 1,
    'een omschrijving met nul euro is een belofte en hoort te blijven');
assert.strictEqual(F.offerteGevuldeRegels([{ description: '', qty: 1, unit_price: 950 }]).length, 1,
    'een bedrag zonder omschrijving is slordig maar wel geld; stil weglaten verandert het totaal');
assert.strictEqual(F.offerteGevuldeRegels([{ description: '', qty: 20, unit_price: 70 }]).length, 1,
    'ook als het bedrag uit aantal maal stuksprijs komt');

// Voorbeeld met dezelfde vorm als een echte offerte: vier regels, waarvan één placeholder.
const GYM = [
    PLACEHOLDER,
    { description: 'Campagnebeheer', qty: 1, unit_price: 400, type: 'per_maand', optie: 'a' },
    { description: 'Contentproductie', qty: 1, unit_price: 800, type: 'eenmalig', optie: 'a' },
    { description: 'Advertenties en content', qty: 1, unit_price: 1100, type: 'eenmalig', optie: 'b' }
];
const schoon = F.offerteGevuldeRegels(GYM);
assert.strictEqual(schoon.length, 3, 'alleen de placeholder valt weg');
const gym = F.offerteGroepen(schoon, [{ id: 'a', naam: 'Optie 1' }, { id: 'b', naam: 'Optie 2' }]);
assert.strictEqual(gym.gedeeld.length, 0, 'er blijft geen gedeelde regel over');
assert.strictEqual(gym.groepen[0].items.length, 2, 'optie 1 houdt haar twee eigen regels');
assert.strictEqual(gym.groepen[1].items.length, 1, 'optie 2 houdt haar ene regel');
// En de bedragen veranderen er niet van: nul maal nul telde toch al niet mee.
assert.strictEqual(F.offerteBedragen(schoon, 21).totaal, F.offerteBedragen(GYM, 21).totaal,
    'filteren mag geen cent schelen');

[null, undefined, 'x', {}].forEach(x => {
    assert.strictEqual(F.offerteGevuldeRegels(x).length, 0, 'onzin geeft een lege lijst: ' + JSON.stringify(x));
});

console.log('Offertetaal: NL en EN lopen gelijk, eigen voorwaarden blijven staan, bedragen volgen de taal, '
    + 'voorwaarden splitsen op zowel bullets als regels, opties groeperen zonder regels kwijt te raken, '
    + 'en lege placeholderregels halen het document niet.');
