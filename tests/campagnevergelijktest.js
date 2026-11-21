/* Plan tegenover werkelijk (campagnevergelijk.js). Voorbeeldcijfers met
   dezelfde vorm als de echte: maandrijen die deels buiten de planperiode
   vallen, en leads net voor en net na die periode. Gebruikt de echte
   CAMPAGNEPLAN.reken(). */
const fs = require('fs');
const vm = require('vm');
const pad = __dirname + '/../frontend/';
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(pad + 'campagneplan.js', 'utf8') + '\nthis.CAMPAGNEPLAN = CAMPAGNEPLAN;', ctx);
vm.runInContext(fs.readFileSync(pad + 'campagnevergelijk.js', 'utf8') + '\nthis.CAMPAGNEVERGELIJK = CAMPAGNEVERGELIJK;', ctx);
const { CAMPAGNEVERGELIJK: CV } = ctx;

let fout = 0;
const check = (naam, ok) => { console.log((ok ? '  ok   ' : '  FOUT ') + naam); if (!ok) fout++; };
const dicht = (a, b) => a != null && Math.abs(a - b) < 0.01;

const plan = { naam: 'Voorbeeldplan', platform: 'Meta', ad_spend: '1200.00',
    start_datum: '2026-08-28', eind_datum: '2026-09-30', prijs: '2000', cpc: '2.00',
    ctr: '1.20', cvr: '2.50', meeting_rate: '25', closing_rate: '20' };
const rijen = [
    { date_start: '2026-06-01', date_end: '2026-06-30', metrics: { spend: 700.00, impressions: 110000, link_clicks: 900 } },
    { date_start: '2026-08-01', date_end: '2026-08-31', metrics: { spend: 50.00, impressions: 2000, link_clicks: 40 } },
    { date_start: '2026-09-01', date_end: '2026-09-30', metrics: { spend: 950.00, impressions: 30000, link_clicks: 600 } },
    { date_start: '2026-10-01', date_end: '2026-10-05', metrics: { spend: 100.00, impressions: 4000, link_clicks: 80 } },
];
const leads = [
    { received_at: '2026-08-27T10:00:00Z' },   // net ervoor
    { received_at: '2026-08-28T09:00:00Z' },
    { received_at: '2026-09-15T12:00:00Z' },
    { received_at: '2026-09-30T22:00:00Z' },
    { received_at: '2026-10-01T08:00:00Z' },   // net erna
];

const r = CV.vergelijk(plan, rijen, leads);
const regel = k => r.regels.find(x => x.sleutel === k);

check('maanden die de planperiode raken: augustus en september', r.maanden.join(',') === '2026-08,2026-09');
check('werkelijk budget = aug + sep (1000)', dicht(regel('spend').werkelijk, 1000));
check('werkelijke klikken = 40 + 600', regel('clicks').werkelijk === 640);
check('leads alleen binnen de planperiode (3)', regel('leads').werkelijk === 3);
check('werkelijke CPL = 1000 / 3', dicht(regel('cpl').werkelijk, 1000 / 3));
check('verwachte klikken uit het plan = 1200 / 2,00', dicht(regel('clicks').verwacht, 600));
check('verwachte leads = klikken x 2,5%', dicht(regel('leads').verwacht, 15));
check('verwachte CPL = 1200 / 15', dicht(regel('cpl').verwacht, 80));
check('alleen de marketingketen: geen afspraken, deals of omzet',
    !r.regels.some(x => ['afspraken', 'deals', 'omzet', 'roas'].includes(x.sleutel)));

// beter/slechter: richting telt
check('minder leads dan verwacht (3 tegen 15) is slechter', CV.beter(regel('leads')) === false);
check('hogere CPL dan verwacht is slechter', CV.beter(regel('cpl')) === false);
check('budget kent geen beter of slechter', CV.beter(regel('spend')) === null);

// Leeg is niet nul
const leeg = CV.vergelijk(plan, [], leads);
check('zonder advertentierijen is werkelijk budget onbekend, niet 0', leeg.regels.find(x => x.sleutel === 'spend').werkelijk === null);
check('zonder rijen is de CPL onbekend', leeg.regels.find(x => x.sleutel === 'cpl').werkelijk === null);
const zonderLeads = CV.vergelijk(plan, rijen, []);
check('nul leads geeft geen CPL (deling door nul)', zonderLeads.regels.find(x => x.sleutel === 'cpl').werkelijk === null);
check('kanaal van Meta is meta_ads', CV.KANAAL_VAN_PLATFORM['Meta'] === 'meta_ads');

console.log(fout ? '\n' + fout + ' fouten.' : '\nCampagnevergelijk: plan tegenover werkelijk klopt, alleen de marketingketen, en leeg blijft leeg.');
process.exit(fout ? 1 : 0);
