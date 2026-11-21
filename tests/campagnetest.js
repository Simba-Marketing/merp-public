/* Rekent de campagneplan-keten door. Het gaat om twee dingen:
   klopt de rekensom, en stopt de keten netjes zodra een aanname ontbreekt.
   Dat tweede is belangrijker: een plan dat compleet oogt maar op een verzonnen
   standaardwaarde steunt, is erger dan een plan met streepjes erin. */

global.document = { getElementById: () => null, querySelectorAll: () => [] };
eval(require('fs').readFileSync(require('path').join(__dirname, '..', 'frontend', 'campagneplan.js'), 'utf8') + ';global.CAMPAGNEPLAN=CAMPAGNEPLAN;');

let fouten = 0;
const eis = (naam, waar, extra) => {
    if (!waar) { console.log('  FOUT: ' + naam + (extra ? '  (' + extra + ')' : '')); fouten++; }
};
const bij = (a, b) => a != null && Math.abs(a - b) < 0.01;

// ---- 1. De volledige keten met ronde getallen ----
// 1000 budget, CPC 2  -> 500 clicks
// CTR 2%              -> 25.000 vertoningen
// CVR 10%             -> 50 leads, CPL 20
// afspraakratio 40%   -> 20 afspraken
// sluitingsratio 25%  -> 5 deals
// prijs 1000          -> 5.000 omzet, ROAS 5
const r = CAMPAGNEPLAN.reken({
    ad_spend: 1000, cpc: 2, ctr: 2, cvr: 10,
    meeting_rate: 40, closing_rate: 25, prijs: 1000
});
eis('clicks = budget / CPC', bij(r.clicks, 500), r.clicks);
eis('vertoningen = clicks / CTR', bij(r.vertoningen, 25000), r.vertoningen);
eis('leads = clicks * CVR', bij(r.leads, 50), r.leads);
eis('CPL = budget / leads', bij(r.cpl, 20), r.cpl);
eis('afspraken = leads * ratio', bij(r.afspraken, 20), r.afspraken);
eis('deals = afspraken * ratio', bij(r.deals, 5), r.deals);
eis('omzet = deals * prijs', bij(r.omzet, 5000), r.omzet);
eis('ROAS = omzet / budget', bij(r.roas, 5), r.roas);

// ---- 2. De keten stopt waar een aanname ontbreekt ----
const zonderCvr = CAMPAGNEPLAN.reken({ ad_spend: 1000, cpc: 2, ctr: 2 });
eis('zonder CVR: clicks nog wel', bij(zonderCvr.clicks, 500));
eis('zonder CVR: leads onbekend', zonderCvr.leads === null);
eis('zonder CVR: CPL onbekend', zonderCvr.cpl === null);
eis('zonder CVR: ROAS onbekend', zonderCvr.roas === null);

const leeg = CAMPAGNEPLAN.reken({});
eis('leeg plan geeft overal null', Object.values(leeg).every(v => v === null));

// ---- 3. Delen door nul levert geen Infinity op ----
const nulCpc = CAMPAGNEPLAN.reken({ ad_spend: 1000, cpc: 0 });
eis('CPC 0 geeft geen Infinity', nulCpc.clicks === null, nulCpc.clicks);
const nulSpend = CAMPAGNEPLAN.reken({ ad_spend: 0, cpc: 2, ctr: 2, cvr: 10, prijs: 100,
                                      meeting_rate: 50, closing_rate: 50 });
eis('budget 0 geeft geen deling door nul bij ROAS', nulSpend.roas === null, nulSpend.roas);
const nulLeads = CAMPAGNEPLAN.reken({ ad_spend: 1000, cpc: 2, ctr: 2, cvr: 0 });
eis('CVR 0: leads is 0, CPL onbekend', nulLeads.leads === 0 && nulLeads.cpl === null);

// ---- 4. Tekst uit de database is ook geldig; PostgREST geeft numeric als string ----
const alsTekst = CAMPAGNEPLAN.reken({
    ad_spend: '1000.00', cpc: '2.00', ctr: '2.00', cvr: '10.00',
    meeting_rate: '40.00', closing_rate: '25.00', prijs: '1000.00'
});
eis('numeriek-als-tekst rekent hetzelfde', bij(alsTekst.roas, 5), alsTekst.roas);

// ---- 5. Opmaak ----
eis('onbekend wordt een streepje', CAMPAGNEPLAN.euro(null) === '&mdash;');
eis('euro zonder decimalen', CAMPAGNEPLAN.euro(1234.6).indexOf('1.235') > 0, CAMPAGNEPLAN.euro(1234.6));
eis('ratio met x', CAMPAGNEPLAN.ratio(5) === '5,00x', CAMPAGNEPLAN.ratio(5));
eis('tekst wordt ontsmet',
    CAMPAGNEPLAN.veilig('<img onerror=x>') === '&lt;img onerror=x&gt;');

// ---- 6. Periode ----
eis('alleen startdatum', CAMPAGNEPLAN.periodeTekst({ start_datum: '2026-08-01' }).startsWith('vanaf'));
eis('geen datums', CAMPAGNEPLAN.periodeTekst({}) === 'geen periode');

console.log(fouten === 0
    ? 'Campagneplan: rekenketen klopt en stopt waar een aanname ontbreekt.'
    : '\n' + fouten + ' fouten.');
process.exit(fouten ? 1 : 0);
