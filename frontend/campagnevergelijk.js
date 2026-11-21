/* ============================================
   CAMPAGNEVERGELIJK — plan tegenover werkelijk (19-11-2026)
   ============================================
   Een campagneplan (campaign_plans) zegt wat je verwacht; performance_data en
   campaign_leads zeggen wat er gebeurde. Dit bestand legt die twee naast
   elkaar. Het REKENT alleen en haalt niets op, net als ecommerce.js: de
   klantpagina doet de queries, zodat RLS de grens blijft.

   - Het verwachte deel komt uit CAMPAGNEPLAN.reken() (campagneplan.js). Eén
     plek voor de formules; een tweede kopie hier zou binnen een maand afwijken.
   - Alleen de marketingketen: budget tot en met kosten per lead. Afspraken,
     deals en omzet zijn sales en staan in de module Sales.
   - De advertentiecijfers staan PER MAAND. Een rij telt mee als zijn maand de
     planperiode raakt; de maanden staan in `maanden`, zodat het scherm kan
     zeggen over welke periode "werkelijk" gaat. Leads hebben een exacte datum
     en tellen alleen binnen de planperiode.
   - Leeg is niet nul: geen enkele advertentierij betekent onbekend (null),
     niet nul euro. Een deling zonder noemer is ook null.
*/
const CAMPAGNEVERGELIJK = {

    // platform in campaign_plans  ->  kanaal in performance_data
    KANAAL_VAN_PLATFORM: { 'Meta': 'meta_ads', 'Google Ads': 'google_ads', 'LinkedIn': 'linkedin_ads' },

    _getal(v) {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    },

    _deel(a, b, keer) {
        if (a == null || b == null || b === 0) return null;
        return (a / b) * (keer || 1);
    },

    /* Raakt deze rij de planperiode? Datums als 'YYYY-MM-DD' (tekstvergelijking). */
    raakt(rij, van, tot) {
        const s = String(rij.date_start || '').slice(0, 10);
        const e = String(rij.date_end || rij.date_start || '').slice(0, 10);
        return !!s && (!tot || s <= tot) && (!van || e >= van);
    },

    vergelijk(plan, rijen, leads, reken) {
        const v = (reken || CAMPAGNEPLAN.reken.bind(CAMPAGNEPLAN))(plan);
        const van = plan.start_datum ? String(plan.start_datum).slice(0, 10) : null;
        const tot = plan.eind_datum ? String(plan.eind_datum).slice(0, 10) : null;

        const raak = (rijen || []).filter(r => this.raakt(r, van, tot));
        const som = sleutel => raak.reduce((s, r) => {
            const m = r.metrics || {};
            const w = this._getal(m[sleutel]);
            return w == null ? s : s + w;
        }, 0);
        const heeft = raak.length > 0;
        const spend = heeft ? som('spend') : null;
        const vertoningen = heeft ? som('impressions') : null;
        // Meta noemt het link_clicks; andere kanalen clicks.
        const klikken = heeft
            ? raak.reduce((s, r) => {
                const m = r.metrics || {};
                const w = this._getal(m.link_clicks != null ? m.link_clicks : m.clicks);
                return w == null ? s : s + w;
            }, 0)
            : null;
        const nLeads = (van && tot)
            ? (leads || []).filter(l => {
                const d = String(l.received_at || '').slice(0, 10);
                return d >= van && d <= tot;
            }).length
            : null;

        const w = {
            spend, vertoningen, clicks: klikken,
            ctr: this._deel(klikken, vertoningen, 100),
            cpc: this._deel(spend, klikken),
            leads: nLeads,
            cvr: this._deel(nLeads, klikken, 100),
            cpl: nLeads ? this._deel(spend, nLeads) : null,
        };

        const maanden = [...new Set(raak.map(r => String(r.date_start).slice(0, 7)))].sort();

        const R = (sleutel, label, soort, beter) =>
            ({ sleutel, label, soort, beter, verwacht: v[sleutel], werkelijk: w[sleutel] });
        return {
            van, tot, maanden,
            regels: [
                R('spend',       'Budget',            'euro',  null),
                R('vertoningen', 'Vertoningen',       'getal', 'hoger'),
                R('clicks',      'Klikken',           'getal', 'hoger'),
                R('ctr',         'CTR',               'pct',   'hoger'),
                R('cpc',         'Kosten per klik',   'euro',  'lager'),
                R('leads',       'Leads',             'getal', 'hoger'),
                R('cvr',         'Conversie',         'pct',   'hoger'),
                R('cpl',         'Kosten per lead',   'euro',  'lager'),
            ],
        };
    },

    /* Is werkelijk beter dan verwacht? true, false, of null als het niet te
       zeggen is (een kant ontbreekt, of het is budget: daar is geen beter). */
    beter(regel) {
        if (!regel.beter || regel.verwacht == null || regel.werkelijk == null) return null;
        if (regel.werkelijk === regel.verwacht) return null;
        return regel.beter === 'hoger' ? regel.werkelijk > regel.verwacht : regel.werkelijk < regel.verwacht;
    },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { CAMPAGNEVERGELIJK };
