/* De leadkaart: projectie, groeperen en de aansluiting op de pagina.
 *
 * WAT HIER ECHT MIS KAN GAAN, en dus wat deze test bewaakt:
 *
 * 1. LON EN LAT VERWISSELD. De klassieke fout met GeoJSON, want daar staat de
 *    lengtegraad voorop en in bijna elke andere notatie de breedtegraad. Je
 *    ziet het niet aan een foutmelding maar aan een kaart die ergens in de
 *    Indische Oceaan ligt. De controle: elk punt in nl-kaart.js moet binnen
 *    Nederland vallen.
 * 2. DE Y-AS OMGEKEERD. In Mercator hoort het noorden een KLEINERE y te
 *    hebben, want het beeld loopt van boven naar onder. Klopt dat niet, dan
 *    staat Nederland op zijn kop en dat is op een vlakkenkaart zonder namen
 *    niet meteen te zien.
 * 3. GROEPEREN. Een lead zonder coordinaat moet wegvallen, twee leads in
 *    hetzelfde gebied moeten een stip van twee worden, en een onleesbare datum
 *    mag de pulsering niet stilzetten.
 * 4. De ids en functies die het scherm nodig heeft. `node --check` vindt een
 *    verdwenen id niet; zie koppelPil() op 23-10.
 */
const fs = require('fs');
const path = require('path');

const wortel = path.join(__dirname, '..', 'frontend');
let fouten = 0;
function ok(wat, goed) {
    if (!goed) { console.log('  FOUT: ' + wat); fouten++; }
}

global.window = global;
require(path.join(wortel, 'nl-kaart.js'));
const K = require(path.join(wortel, 'leadkaart.js'));

/* ---------- 1. de kaartgegevens ---------- */
const kaart = global.window.NL_KAART;
ok('nl-kaart.js levert twaalf provincies', kaart && kaart.provincies.length === 12);

let punten = 0, buiten = 0, ergstX = null, ergstY = null;
for (const prov of kaart.provincies) {
    ok('provincie ' + prov.naam + ' heeft minstens een ring', prov.ringen.length > 0);
    for (const ring of prov.ringen) {
        ok('ring van ' + prov.naam + ' heeft een even aantal getallen',
           ring.length % 2 === 0);
        for (let i = 0; i < ring.length; i += 2) {
            const lon = ring[i], lat = ring[i + 1];
            punten++;
            /* Iets ruimer dan de kaartgrenzen: de Waddeneilanden en Zeeland
               liggen net buiten het blok dat het beeld standaard laat zien. */
            if (lon < 3.0 || lon > 7.5 || lat < 50.5 || lat > 53.8) {
                buiten++;
                if (ergstX === null) { ergstX = lon; ergstY = lat; }
            }
        }
    }
}
ok('alle ' + punten + ' punten liggen in Nederland'
   + (buiten ? ' -> ' + buiten + ' erbuiten, eerste: ' + ergstX + ', ' + ergstY : ''),
   buiten === 0);
ok('er zijn genoeg punten voor een herkenbare kaart', punten > 1200);

/* En de omgekeerde controle: zou iemand lon en lat verwisselen, dan MOET deze
   test aanslaan. Anders bewijst hij niets. */
const omgedraaid = kaart.provincies[0].ringen[0].slice();
let zouAanslaan = false;
for (let i = 0; i < omgedraaid.length; i += 2) {
    const lon = omgedraaid[i + 1], lat = omgedraaid[i];   // bewust verwisseld
    if (lon < 3.0 || lon > 7.5 || lat < 50.5 || lat > 53.8) { zouAanslaan = true; break; }
}
ok('de controle slaat aan als lon en lat verwisseld zijn', zouAanslaan);

/* ---------- 2. de projectie ---------- */
const heen = (lon, lat) => ({ x: K._wx(lon), y: K._wy(lat) });
const terug = (x, y) => ({ lon: K._lonVan(x), lat: K._latVan(y) });

for (const [lon, lat] of [[4.9, 52.37], [6.9, 53.2], [3.6, 51.5], [5.8, 50.85]]) {
    const w = heen(lon, lat);
    const r = terug(w.x, w.y);
    ok('heen en terug voor ' + lon + ',' + lat,
       Math.abs(r.lon - lon) < 1e-9 && Math.abs(r.lat - lat) < 1e-9);
    ok('punt ' + lon + ',' + lat + ' ligt binnen het eenheidsvierkant',
       w.x > 0 && w.x < 1 && w.y > 0 && w.y < 1);
}

// Het noorden hoort BOVEN te liggen, dus een kleinere y.
ok('het noorden heeft een kleinere y dan het zuiden',
   K._wy(53.5) < K._wy(50.8));
ok('het oosten heeft een grotere x dan het westen',
   K._wx(7.0) > K._wx(3.5));

/* Nederland moet in de hoogte ongeveer driekwart van de breedte beslaan. Een
   platte lon/lat-schaal zou hier ver vandaan uitkomen, en dat is precies de
   vervorming die Mercator hier voorkomt. */
const bx = K._wx(K.NL.oost) - K._wx(K.NL.west);
const by = K._wy(K.NL.zuid) - K._wy(K.NL.noord);
ok('Nederland is hoger dan breed in wereldcoordinaten (' + (by / bx).toFixed(2) + ')',
   by / bx > 0.9 && by / bx < 1.6);

/* ---------- 3. groeperen ---------- */
const leads = [
    { lead_lat: 52.37, lead_lon: 4.90, lead_city: 'Amsterdam', received_at: '2026-10-01T10:00:00Z' },
    { lead_lat: 52.37, lead_lon: 4.90, lead_city: 'Amsterdam', received_at: '2026-10-20T10:00:00Z' },
    { lead_lat: 52.37, lead_lon: 4.90, lead_city: null,        received_at: '2026-10-05T10:00:00Z' },
    { lead_lat: 51.92, lead_lon: 4.48, lead_city: 'Rotterdam', received_at: '2026-10-10T10:00:00Z' },
    { lead_lat: null,  lead_lon: null, lead_city: 'Berlijn',   received_at: '2026-10-11T10:00:00Z' },
    { lead_lat: 51.44, lead_lon: 5.48, lead_city: 'Eindhoven', received_at: 'binnenkort' },
];
const groepen = K.groepeer(leads);
ok('drie gebieden uit zes leads', groepen.length === 3);

const ams = groepen.find(g => g.plaats === 'Amsterdam');
ok('Amsterdam telt drie leads', ams && ams.aantal === 3);
ok('de plaatsnaam blijft staan als een lead hem mist', ams && ams.plaats === 'Amsterdam');
ok('de laatste lead van het gebied is de nieuwste',
   ams && ams.laatste === new Date('2026-10-20T10:00:00Z').getTime());

ok('een lead zonder coordinaat staat niet op de kaart',
   !groepen.some(g => g.plaats === 'Berlijn'));

const ehv = groepen.find(g => g.plaats === 'Eindhoven');
/* Een onleesbare datum geeft NaN, en NaN is nooit groter dan iets. Zonder de
   isFinite-controle komt die NaN in `laatste` en zet dat de pulsering uit. */
ok('een onleesbare datum wordt nul en geen NaN', ehv && ehv.laatste === 0);

ok('klein naar groot, zodat een groot gebied bovenop ligt',
   groepen.every((g, i) => i === 0 || groepen[i - 1].aantal <= g.aantal));

ok('geen leads geeft geen groepen', K.groepeer([]).length === 0);
ok('null geeft geen groepen', K.groepeer(null).length === 0);

/* ---------- 3b. de kaart ECHT laten tekenen ----------
 *
 * Dit is het deel dat `node --check` niet kan: een ontbrekende functie of een
 * naam uit de verkeerde scope in de tekenlus valt pas om bij het uitvoeren.
 * Precies de fout die op 26-10 drie keer langskwam. Het canvas is nagebootst
 * met een Proxy, dus elke aanroep die teken() doet bestaat vanzelf en we zien
 * alleen de ECHTE fouten.
 */
const aanroepen = {};
const ctx2d = new Proxy({}, {
    get(_, p) {
        if (p === 'measureText') return () => ({ width: 60 });
        if (p === 'canvas') return null;
        return (...a) => { aanroepen[String(p)] = (aanroepen[String(p)] || 0) + 1; };
    },
    set() { return true; }
});

const luisteraars = {};
const nepCanvas = {
    width: 0, height: 0, style: {}, dataset: {},
    classList: { add() {}, remove() {} },
    getContext: () => ctx2d,
    getBoundingClientRect: () => ({ width: 900, height: 560, left: 0, top: 0 }),
    addEventListener: (n, f) => { luisteraars[n] = f; },
    setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => false
};

/* rAF is in een browser ASYNCHROON. Synchroon doorgeven zou van de pulslus een
   recursie maken en dan loopt de stapel over; vandaar de begrenzing. */
let beelden = 0;
global.requestAnimationFrame = (f) => { if (beelden++ < 4) f(); return 1; };
global.cancelAnimationFrame = () => {};
global.matchMedia = () => ({ matches: false });
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
global.document = { documentElement: {} };

let kaartApi = null;
try {
    kaartApi = K.maak(nepCanvas, {});
} catch (err) {
    ok('de kaart is op te bouwen -> ' + err.message, false);
}

if (kaartApi) {
    const veel = [];
    for (let i = 0; i < 400; i++) {
        veel.push({
            lead_lat: 50.9 + (i % 40) * 0.065,
            lead_lon: 3.5 + (i % 25) * 0.15,
            lead_city: 'Plaats ' + (i % 25),
            received_at: new Date(Date.now() - i * 3600000).toISOString()
        });
    }
    let gebieden = 0;
    try {
        gebieden = kaartApi.zet(veel);
    } catch (err) {
        ok('de kaart is te vullen en te tekenen -> ' + err.message, false);
    }
    ok('vierhonderd leads worden ' + gebieden + ' gebieden', gebieden > 20 && gebieden < 400);
    ok('er zijn stippen en vlakken getekend', aanroepen.arc > 0 && aanroepen.fill > 0);
    /* moveTo is EEN PER RING (ongeveer dertig); de punten lopen door lineTo.
       Daar zat mijn eerste drempel fout, en dat is precies waarom je een test
       ook moet zien slagen om wat hij beweert. */
    ok('de ringen zijn begonnen (' + aanroepen.moveTo + ' keer moveTo)',
       aanroepen.moveTo >= 12);
    ok('de provinciegrenzen zijn getekend (' + aanroepen.lineTo + ' punten)',
       aanroepen.lineTo > 1000);

    /* Zoomen moet binnen de grenzen blijven. Zonder die begrenzing kun je tot
       een beeld van een enkele straat of tot een speldenprik uitkomen, en in
       geen van beide gevallen staat er nog iets op het scherm. */
    try {
        for (let i = 0; i < 60; i++) kaartApi.zoomIn();
        ok('verder inzoomen stopt bij MAX_ZOOM', kaartApi.zoom() === K.MAX_ZOOM);
        for (let i = 0; i < 80; i++) kaartApi.zoomUit();
        ok('verder uitzoomen stopt bij MIN_ZOOM', kaartApi.zoom() === K.MIN_ZOOM);
        kaartApi.zoomIn();
        kaartApi.herstel();
        ok('herstellen zet hem terug op heel Nederland', kaartApi.zoom() === 1);
    } catch (err) {
        ok('zoomen en herstellen draaien -> ' + err.message, false);
    }

    // Slepen en scrollen gaan door dezelfde tekenlus.
    try {
        luisteraars.pointerdown({ pointerId: 1, clientX: 400, clientY: 300 });
        luisteraars.pointermove({ pointerId: 1, clientX: 450, clientY: 320 });
        luisteraars.pointerup({ pointerId: 1, clientX: 450, clientY: 320 });
        luisteraars.wheel({ preventDefault() {}, deltaMode: 0, deltaY: -400,
                            clientX: 400, clientY: 300 });
        ok('scrollen zoomt in', kaartApi.zoom() > 1);
    } catch (err) {
        ok('slepen en scrollen draaien -> ' + err.message, false);
    }

    /* Een lege set en een lead zonder coordinaat mogen de kaart niet breken:
       dat is de stand op de dag dat een nieuwe klant begint. */
    try {
        kaartApi.zet([{ lead_lat: null, lead_lon: null }]);
        kaartApi.zet([]);
        ok('een lege kaart valt niet om', true);
    } catch (err) {
        ok('een lege kaart valt niet om -> ' + err.message, false);
    }
}

console.log();
console.log(fouten
    ? fouten + ' fouten.'
    : 'Leadkaart: ' + punten + ' kaartpunten liggen in Nederland, de projectie '
      + 'klopt heen en terug, groeperen telt goed en een lege set breekt niets.');
process.exit(fouten ? 1 : 0);
