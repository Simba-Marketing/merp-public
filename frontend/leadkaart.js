/* Leadkaart — waar de leads vandaan komen, op een kaart die je in kunt zoomen.
 *
 * WAAROM DIT NAAST DE WERELDBOL STAAT EN NIET IN PLAATS VAN.
 * De bol is gemaakt voor een leadstroom uit meerdere landen. Bij een
 * Nederlandse klant staan alle stippen op dezelfde paar pixels, en de
 * landkaart eronder is 2 graden per cel: Nederland is daar twee blokjes
 * breed. Inzoomen op die bol levert dus stippen boven niets herkenbaars op.
 * Deze kaart tekent de echte provinciegrenzen en gaat tot straatniveau.
 *
 * DE STIPPEN ZIJN GEGROEPEERD PER POSTCODEGEBIED, niet per lead.
 * Achttienhonderd stippen op Nederland is een vlek. Eén stip per
 * postcodegebied, met een grootte naar het aantal, laat zien WAAR het
 * aanslaat - en dat is de vraag die een verkoper stelt. De coordinaten komen
 * uit `postcode_pc4` en zijn dus per gebied gelijk; groeperen op coordinaat is
 * daarmee hetzelfde als groeperen op postcode, zonder de postcode nodig te
 * hebben.
 *
 * DIT BESTAND REKENT EN TEKENT, HET HAALT NIETS OP. Net als planning.js en
 * ecommerce.js: beide kanten (klantportaal en Klantenbeheer) doen hun eigen
 * query, zodat RLS de grens blijft.
 *
 * `nl-kaart.js` moet geladen zijn (window.NL_KAART).
 */
(function (global) {
    'use strict';

    const NL = { west: 3.25, oost: 7.3, zuid: 50.7, noord: 53.62 };

    /* Web Mercator naar een eenheidsvierkant. Niet een platte lon/lat-schaal:
       die rekt Nederland zichtbaar uit in de breedte, en bij inzoomen wordt
       dat erger in plaats van minder. */
    function wx(lon) { return (lon + 180) / 360; }
    function wy(lat) {
        const r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
    }
    function lonVan(x) { return x * 360 - 180; }
    function latVan(y) {
        const n = Math.PI * (1 - 2 * y);
        return Math.atan(Math.sinh(n)) * 180 / Math.PI;
    }

    const MIN_ZOOM = 1;        // 1 = heel Nederland past precies
    const MAX_ZOOM = 260;      // ongeveer straatniveau

    /* Leads samenvoegen per postcodegebied.
     *
     * EEN PLEK, en de kaart gebruikt dezelfde. Dit stond eerst twee keer in
     * dit bestand: een keer binnen maak() en een keer op het globale object.
     * Dat is precies de fout van de markdown-omzetter, die in
     * seo-wp-publiceer EN in conceptbesluit.js staat - binnen een maand wijzig
     * je er een en loopt het aantal op de kaart uit de pas met het aantal in
     * een tabel ernaast.
     *
     * De coordinaten komen uit postcode_pc4 en zijn per gebied gelijk, dus
     * groeperen op coordinaat is hetzelfde als groeperen op postcode - zonder
     * dat de postcode zelf mee hoeft naar de browser. */
    function groepeer(leads) {
        const kaart = new Map();
        for (const l of leads || []) {
            if (l.lead_lat == null || l.lead_lon == null) continue;
            const lat = Number(l.lead_lat), lon = Number(l.lead_lon);
            if (!isFinite(lat) || !isFinite(lon)) continue;
            const sleutel = lat.toFixed(4) + ',' + lon.toFixed(4);
            let g = kaart.get(sleutel);
            if (!g) {
                g = { lat: lat, lon: lon, aantal: 0,
                      plaats: l.lead_city || null, laatste: 0 };
                kaart.set(sleutel, g);
            }
            g.aantal++;
            if (!g.plaats && l.lead_city) g.plaats = l.lead_city;
            const t = l.received_at ? new Date(l.received_at).getTime() : 0;
            /* NaN is geen tijd: `new Date('onzin')` geeft NaN, en NaN is nooit
               groter dan iets - zonder isFinite zou zo'n lead de pulsering
               stilletjes uitzetten. */
            if (isFinite(t) && t > g.laatste) g.laatste = t;
        }
        /* Klein naar groot, zodat een groot gebied bovenop komt te liggen en
           niet onder een buurgebied met een enkele lead verdwijnt. */
        return Array.from(kaart.values()).sort((a, b) => a.aantal - b.aantal);
    }

    function maak(canvas, opties) {
        const o = opties || {};
        const ctx = canvas.getContext('2d');
        const S = {
            groepen: [],       // { lat, lon, aantal, plaats, laatste, namen }
            zoom: 1,
            // Middelpunt in wereldcoordinaten; wordt bij passend() gezet.
            cx: 0, cy: 0,
            basis: 1,          // pixels per wereldeenheid bij zoom 1
            sleept: false, vorigeX: 0, vorigeY: 0, bewogen: false,
            aanwijzer: null,   // de groep waar de muis boven staat
            animatie: null,
            breedte: 0, hoogte: 0
        };

        /* ---------- het beeld passend maken ---------- */

        function passend() {
            const b = canvas.getBoundingClientRect();
            S.breedte = b.width; S.hoogte = b.height;
            const bx = wx(NL.oost) - wx(NL.west);
            const by = wy(NL.zuid) - wy(NL.noord);
            // 0.94: een rand eromheen, zodat Zeeland en Limburg niet tegen de
            // zijkant plakken.
            S.basis = Math.min(b.width / bx, b.height / by) * 0.94;
            S.cx = (wx(NL.west) + wx(NL.oost)) / 2;
            S.cy = (wy(NL.noord) + wy(NL.zuid)) / 2;
        }

        function schaal() { return S.basis * S.zoom; }

        function naarScherm(lon, lat) {
            const s = schaal();
            return {
                x: (wx(lon) - S.cx) * s + S.breedte / 2,
                y: (wy(lat) - S.cy) * s + S.hoogte / 2
            };
        }

        function naarKaart(px, py) {
            const s = schaal();
            return {
                lon: lonVan((px - S.breedte / 2) / s + S.cx),
                lat: latVan((py - S.hoogte / 2) / s + S.cy)
            };
        }

        /* ---------- tekenen ---------- */

        function kleur(naam, terugval) {
            const v = getComputedStyle(document.documentElement)
                .getPropertyValue(naam).trim();
            return v || terugval;
        }

        function teken() {
            const dpr = window.devicePixelRatio || 1;
            const b = canvas.getBoundingClientRect();
            if (!b.width || !b.height) return;
            if (canvas.width !== Math.round(b.width * dpr)
                || canvas.height !== Math.round(b.height * dpr)) {
                canvas.width = Math.round(b.width * dpr);
                canvas.height = Math.round(b.height * dpr);
            }
            S.breedte = b.width; S.hoogte = b.height;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, b.width, b.height);

            const land = kleur('--surface', '#FFFFFF');
            const rand = kleur('--border', '#E7E4DF');
            const inkt = kleur('--action', '#04122D');

            // Water als ondergrond: de paginakleur, niet blauw. Kleur is in dit
            // systeem betekenis, en water betekent niets.
            ctx.fillStyle = kleur('--surface-sunken', '#FAF9F7');
            ctx.fillRect(0, 0, b.width, b.height);

            const kaart = global.NL_KAART;
            if (kaart && kaart.provincies) {
                ctx.lineJoin = 'round';
                for (const prov of kaart.provincies) {
                    for (const ring of prov.ringen) {
                        ctx.beginPath();
                        for (let i = 0; i < ring.length; i += 2) {
                            const p = naarScherm(ring[i], ring[i + 1]);
                            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                        }
                        ctx.closePath();
                        ctx.fillStyle = land;
                        ctx.fill();
                        ctx.strokeStyle = rand;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            /* De stippen. Oppervlak naar het aantal, dus de radius met een
               wortel: anders is een gebied met honderd leads honderd keer zo
               breed als een met een, en dekt die ene stip de halve Randstad. */
            const grootste = S.groepen.reduce((m, g) => Math.max(m, g.aantal), 1);
            const basisR = Math.max(3, Math.min(9, 3 + Math.log(S.zoom + 1) * 2));
            const nu = Date.now();
            let verseStip = false;

            for (const g of S.groepen) {
                const p = naarScherm(g.lon, g.lat);
                if (p.x < -40 || p.y < -40 || p.x > b.width + 40 || p.y > b.height + 40) continue;
                const r = basisR * (0.65 + 0.9 * Math.sqrt(g.aantal / grootste));

                // Een lead van het laatste kwartier krijgt een uitdijende ring.
                if (!S.stil && g.laatste && nu - g.laatste < 15 * 60 * 1000) {
                    verseStip = true;
                    const fase = (nu % 2000) / 2000;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r + 2 + fase * 16, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(4, 18, 45, ' + (0.4 * (1 - fase)).toFixed(3) + ')';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = inkt;
                ctx.globalAlpha = g === S.aanwijzer ? 1 : 0.72;
                ctx.fill();
                ctx.globalAlpha = 1;

                // Bij voldoende ruimte het aantal in de stip.
                if (r >= 11) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '600 ' + Math.round(r * 0.95) + 'px ' +
                        (kleur('--font-heading', '') || 'system-ui');
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(g.aantal), p.x, p.y + 0.5);
                }
            }

            if (S.aanwijzer) tekenLabel(S.aanwijzer);

            // De lus loopt alleen zolang er iets te animeren is.
            if (verseStip && !S.stil) {
                S.animatie = requestAnimationFrame(teken);
            } else {
                S.animatie = null;
            }
        }

        function tekenLabel(g) {
            const p = naarScherm(g.lon, g.lat);
            const tekst = (g.plaats || 'Onbekend') + ' · '
                + g.aantal + (g.aantal === 1 ? ' lead' : ' leads');
            ctx.font = '500 12px ' + (kleur('--font-body', '') || 'system-ui');
            const br = ctx.measureText(tekst).width + 16;
            const ho = 24;
            let x = p.x - br / 2;
            let y = p.y - ho - 12;
            // Binnen beeld houden: een label dat half buiten de rand valt is
            // precies bij de rand onleesbaar, en daar staan Zeeland en Limburg.
            x = Math.max(4, Math.min(S.breedte - br - 4, x));
            if (y < 4) y = p.y + 14;

            ctx.fillStyle = kleur('--action', '#04122D');
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, br, ho, 6);
            else ctx.rect(x, y, br, ho);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tekst, x + 8, y + ho / 2);
        }

        function hertekenen() {
            if (S.animatie) return;        // de lus pakt het op
            S.animatie = requestAnimationFrame(teken);
        }

        /* ---------- zoomen en slepen ---------- */

        function zoomNaar(nieuw, ankerX, ankerY) {
            const begrensd = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nieuw));
            if (begrensd === S.zoom) return;
            /* Het punt onder de cursor moet onder de cursor BLIJVEN. Zonder dit
               zoomt hij naar het midden en loopt wat je wilde bekijken weg. */
            const voor = naarKaart(ankerX, ankerY);
            S.zoom = begrensd;
            const na = naarKaart(ankerX, ankerY);
            S.cx += wx(voor.lon) - wx(na.lon);
            S.cy += wy(voor.lat) - wy(na.lat);
            begrensMidden();
            hertekenen();
            if (o.opZoom) o.opZoom(S.zoom);
        }

        /* Niet verder wegslepen dan het land zelf. Anders kun je Nederland uit
           beeld schuiven en is er geen knop die je terugbrengt behalve de
           herstelknop, en die moet je dan wel zien. */
        function begrensMidden() {
            const s = schaal();
            const halfX = S.breedte / 2 / s, halfY = S.hoogte / 2 / s;
            const wW = wx(NL.west), wO = wx(NL.oost);
            const wN = wy(NL.noord), wZ = wy(NL.zuid);
            S.cx = (wO - wW) < halfX * 2
                ? (wW + wO) / 2
                : Math.max(wW + halfX * 0.3, Math.min(wO - halfX * 0.3, S.cx));
            S.cy = (wZ - wN) < halfY * 2
                ? (wN + wZ) / 2
                : Math.max(wN + halfY * 0.3, Math.min(wZ - halfY * 0.3, S.cy));
        }

        function dichtbij(px, py) {
            let best = null, bestAf = 22;
            for (const g of S.groepen) {
                const p = naarScherm(g.lon, g.lat);
                const af = Math.hypot(p.x - px, p.y - py);
                if (af < bestAf) { bestAf = af; best = g; }
            }
            return best;
        }

        function plek(e) {
            const b = canvas.getBoundingClientRect();
            return { x: e.clientX - b.left, y: e.clientY - b.top };
        }

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const p = plek(e);
            // deltaMode 1 is regels, 2 is pagina's; dan is deltaY veel kleiner.
            const stap = e.deltaMode === 0 ? e.deltaY : e.deltaY * 18;
            zoomNaar(S.zoom * Math.pow(0.9988, stap), p.x, p.y);
        }, { passive: false });

        canvas.addEventListener('pointerdown', (e) => {
            canvas.setPointerCapture(e.pointerId);
            S.sleept = true; S.bewogen = false;
            const p = plek(e);
            S.vorigeX = p.x; S.vorigeY = p.y;
            canvas.classList.add('is-slepen');
        });

        canvas.addEventListener('pointermove', (e) => {
            const p = plek(e);
            if (S.sleept) {
                const s = schaal();
                const dx = p.x - S.vorigeX, dy = p.y - S.vorigeY;
                if (Math.abs(dx) + Math.abs(dy) > 2) S.bewogen = true;
                S.cx -= dx / s; S.cy -= dy / s;
                S.vorigeX = p.x; S.vorigeY = p.y;
                begrensMidden();
                hertekenen();
                return;
            }
            const was = S.aanwijzer;
            S.aanwijzer = dichtbij(p.x, p.y);
            canvas.style.cursor = S.aanwijzer ? 'pointer' : 'grab';
            if (was !== S.aanwijzer) hertekenen();
        });

        function laat(e) {
            if (!S.sleept) return;
            S.sleept = false;
            canvas.classList.remove('is-slepen');
            if (e && e.pointerId != null && canvas.hasPointerCapture(e.pointerId)) {
                canvas.releasePointerCapture(e.pointerId);
            }
        }
        canvas.addEventListener('pointerup', laat);
        canvas.addEventListener('pointercancel', laat);
        canvas.addEventListener('pointerleave', (e) => {
            laat(e);
            if (S.aanwijzer) { S.aanwijzer = null; hertekenen(); }
        });

        canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const p = plek(e);
            zoomNaar(S.zoom * 2.2, p.x, p.y);
        });

        /* Knijpen op een aanraakscherm. Twee vingers volgen we zelf, want
           `touch-action: none` zet de browser-eigen zoom uit en dan gebeurt er
           zonder dit niets. */
        let knijpAf = 0;
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                knijpAf = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });
        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 2 || !knijpAf) return;
            e.preventDefault();
            const af = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY);
            const b = canvas.getBoundingClientRect();
            const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - b.left;
            const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - b.top;
            zoomNaar(S.zoom * (af / knijpAf), mx, my);
            knijpAf = af;
        }, { passive: false });
        canvas.addEventListener('touchend', () => { knijpAf = 0; }, { passive: true });

        /* ---------- wat de buitenkant gebruikt ---------- */

        const api = {
            zet(leads) {
                S.groepen = groepeer(leads);
                hertekenen();
                return S.groepen.length;
            },
            herstel() {
                S.zoom = 1;
                passend();
                hertekenen();
                if (o.opZoom) o.opZoom(S.zoom);
            },
            zoomIn()  { zoomNaar(S.zoom * 1.6, S.breedte / 2, S.hoogte / 2); },
            zoomUit() { zoomNaar(S.zoom / 1.6, S.breedte / 2, S.hoogte / 2); },
            zoom()    { return S.zoom; },
            meten()   { passend(); hertekenen(); },
            teken: hertekenen,
            // Voor een test of een stil beeld (een schermafdruk): geen pulsen.
            stil(aan) { S.stil = !!aan; hertekenen(); }
        };

        passend();
        /* Bewegen uit als de bezoeker daar om vraagt. De pulsende ring is
           versiering; het cijfer in de stip is de informatie. */
        if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            S.stil = true;
        }
        return api;
    }

    /* De rekenhulpen los, zodat een test ze kan nalopen zonder canvas. */
    global.LEADKAART = {
        maak,
        _wx: wx, _wy: wy, _lonVan: lonVan, _latVan: latVan,
        NL,
        MIN_ZOOM, MAX_ZOOM,
        groepeer
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = global.LEADKAART;
})(typeof window !== 'undefined' ? window : globalThis);
