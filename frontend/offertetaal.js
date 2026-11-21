/* ============================================
   OFFERTE IN TWEE TALEN
   ============================================

   Een offerte staat op drie plekken: de invoermodal met het voorbeeld in de
   lade (`crm.js`), de PDF (`downloadQuotePdf` in `crm.js`) en de publieke
   ondertekenpagina (`offerte.html`). Die drie toonden precies dezelfde vijfentwintig
   koppen en labels, elk met hun eigen kopie van de tekst.

   Daarom staan ze hier, in één bestand dat zowel `crm.html` als `offerte.html`
   laadt. Zet je een label alleen in de PDF goed, dan wijkt de pagina die de
   klant ondertekent ervan af, en dat is precies het document waarvan je later
   wilt kunnen aantonen wat erin stond.

   WAT DE TAAL WEL EN NIET BEPAALT
   De taal verandert alleen de BEWOORDING van het sjabloon. De opbouw, de
   volgorde, de bedragen en de regels blijven gelijk; het is dezelfde offerte in
   een andere taal en geen ander aanbod.

   WAAROM DE TAAL OP DE OFFERTE STAAT EN NIET IN EEN INSTELLING
   De ondertekenpagina is publiek en kent de lezer niet. Kwam de taal uit de
   browser, dan zag de ene ontvanger een andere tekst dan de andere en was
   achteraf niet meer vast te stellen waarvoor iemand getekend heeft. Daarom
   `quotes.taal`, vastgelegd op het moment van opstellen.

   LET OP BIJ DE VOORWAARDEN
   De Engelse voorwaarden zijn een vertaling van de Nederlandse en houden
   Nederlands recht aan; dat is een inhoudelijke keuze en geen vertaalfout.
   Laat ze een keer nalezen door iemand die er juridisch naar kijkt voordat er
   een grote offerte op uitgaat.
*/

// <offertetaal> — ook gedraaid door .claude/tests/offertetaaltest.js; houd dit blok vrij van types.
const OFFERTE_TALEN = ['nl', 'en'];

const OFFERTE_TEKST = {
    nl: {
        locale: 'nl-NL',
        htmlLang: 'nl',
        label: 'Nederlands',
        kort: 'NL',

        offerte: 'Offerte',
        laden: 'Offerte laden...',
        datum: 'Datum',
        geldigTot: 'Geldig tot',

        opdrachtnemer: 'Opdrachtnemer',
        opdrachtgever: 'Opdrachtgever',

        inhoud: 'Inhoud',
        geenInhoud: 'Geen inhoud beschreven.',
        kosten: 'Kosten',
        eenmaligeKosten: 'Eenmalige kosten',
        maandelijkseKosten: 'Maandelijkse kosten',
        voorwaarden: 'Voorwaarden',
        geenVoorwaarden: 'Geen voorwaarden.',
        ondertekening: 'Ondertekening',

        omschrijving: 'Omschrijving',
        aantal: 'Aantal',
        stuksprijs: 'Stuksprijs',
        totaalKolom: 'Totaal',

        subtotaal: 'Subtotaal',
        btw: 'BTW',
        totaal: 'Totaal',
        totaalEenmalig: 'Totaal eenmalig',
        totaalPerMaand: 'Totaal per maand',
        perMaandKort: '/mnd',
        commissieOver: 'over',
        perResultaat: 'Per resultaat',
        perResultaatKort: ' per resultaat',
        resultaatKosten: 'Vergoeding per resultaat',
        resultaatUitleg: 'Deze vergoeding hangt af van het behaalde resultaat en staat daarom bewust niet in het totaal hierboven. Bedragen zijn exclusief btw.',

        optie: 'Optie',
        optiesTitel: 'Maak een keuze',
        optiesUitleg: 'Kies hieronder één van de mogelijkheden. U tekent voor de optie die u aanvinkt.',
        altijdInbegrepen: 'Altijd inbegrepen',
        optieKiezen: 'Kies deze optie',
        optieGekozen: 'Uw keuze',
        optieVerplicht: 'Kies eerst een optie voordat u ondertekent.',
        totaalGekozen: 'Totaal voor uw keuze',
        inclusiefBtw: 'inclusief btw',
        getekendVoor: 'Ondertekend voor',

        namensOpdrachtgever: 'Namens opdrachtgever',
        namensOpdrachtnemer: 'Namens opdrachtnemer',
        volledigeNaam: 'Volledige naam',
        tekenHier: 'Teken hier uw handtekening',
        wissen: 'Wissen',
        wachtOpHandtekening: 'Wacht op handtekening',
        ondertekenen: 'Offerte ondertekenen',
        ondertekenenBezig: 'Ondertekenen...',

        bannerOndertekend: 'Deze offerte is ondertekend op',
        bannerVerlopen: 'Deze offerte is verlopen op',
        bannerWacht: 'Deze offerte wacht op uw handtekening',

        ongeldigeLink: 'Ongeldige link',
        ongeldigeLinkUitleg: 'Deze link is ongeldig of verlopen.',
        nietGevonden: 'Offerte niet gevonden',
        nietGevondenUitleg: 'Deze offerte bestaat niet of de link is verlopen.',
        alOndertekend: 'Deze offerte is al ondertekend of de link is niet meer geldig.',
        ietsMis: 'Er ging iets mis. Probeer het opnieuw.',
        gelukt: 'Offerte succesvol ondertekend!',

        vertrouwelijk: 'Vertrouwelijk',
        bestandsnaam: 'offerte',
    },

    en: {
        locale: 'en-GB',
        htmlLang: 'en',
        label: 'English',
        kort: 'EN',

        offerte: 'Quotation',
        laden: 'Loading quotation...',
        datum: 'Date',
        geldigTot: 'Valid until',

        opdrachtnemer: 'Contractor',
        opdrachtgever: 'Client',

        inhoud: 'Scope of work',
        geenInhoud: 'No scope described.',
        kosten: 'Costs',
        eenmaligeKosten: 'One-off costs',
        maandelijkseKosten: 'Monthly costs',
        voorwaarden: 'Terms and conditions',
        geenVoorwaarden: 'No terms and conditions.',
        ondertekening: 'Signatures',

        omschrijving: 'Description',
        aantal: 'Quantity',
        stuksprijs: 'Unit price',
        totaalKolom: 'Total',

        subtotaal: 'Subtotal',
        btw: 'VAT',
        totaal: 'Total',
        totaalEenmalig: 'Total one-off',
        totaalPerMaand: 'Total per month',
        perMaandKort: '/mo',
        commissieOver: 'of',
        perResultaat: 'Per result',
        perResultaatKort: ' per result',
        resultaatKosten: 'Fee per result',
        resultaatUitleg: 'This fee depends on the result achieved and is therefore deliberately not included in the total above. Amounts exclude VAT.',

        optie: 'Option',
        optiesTitel: 'Make a choice',
        optiesUitleg: 'Please choose one of the options below. You sign for the option you select.',
        altijdInbegrepen: 'Included in every option',
        optieKiezen: 'Choose this option',
        optieGekozen: 'Your choice',
        optieVerplicht: 'Please choose an option before signing.',
        totaalGekozen: 'Total for your choice',
        inclusiefBtw: 'VAT included',
        getekendVoor: 'Signed for',

        namensOpdrachtgever: 'On behalf of the client',
        namensOpdrachtnemer: 'On behalf of the contractor',
        volledigeNaam: 'Full name',
        tekenHier: 'Sign here',
        wissen: 'Clear',
        wachtOpHandtekening: 'Awaiting signature',
        ondertekenen: 'Sign quotation',
        ondertekenenBezig: 'Signing...',

        bannerOndertekend: 'This quotation was signed on',
        bannerVerlopen: 'This quotation expired on',
        bannerWacht: 'This quotation is awaiting your signature',

        ongeldigeLink: 'Invalid link',
        ongeldigeLinkUitleg: 'This link is invalid or has expired.',
        nietGevonden: 'Quotation not found',
        nietGevondenUitleg: 'This quotation does not exist or the link has expired.',
        alOndertekend: 'This quotation has already been signed, or the link is no longer valid.',
        ietsMis: 'Something went wrong. Please try again.',
        gelukt: 'Quotation signed successfully.',

        vertrouwelijk: 'Confidential',
        bestandsnaam: 'quotation',
    }
};

/* De standaardvoorwaarden. Ze staan hier en niet in `crm.js`, zodat de twee
   talen naast elkaar staan en je ziet wanneer er een bullet bijkomt in de ene
   en niet in de andere. */
const OFFERTE_VOORWAARDEN = {
    nl: `• Na de eerste oplevering van content (V1) is er ruimte voor feedback die wordt verwerkt in een tweede versie (V2). Na V2 is er één laatste feedbackronde om tot de definitieve eindversie (V3) te komen.
• In deze offerte wordt uitgegaan van één opnamemiddag van maximaal 4 uur. Opnames vinden plaats op vooraf afgestemde data en tijden op locatie. Reiskosten zijn niet inbegrepen.
• Werkzaamheden buiten de afgesproken scope of buiten het overeengekomen tijdsblok worden aangemerkt als meerwerk en worden, na afstemming, gefactureerd tegen de geldende standaard agency fee van €90 per uur, exclusief btw.
• Facturering zal plaatsvinden conform de afgesproken tarieven bij akkoord (set-up) en vervolgens aan het begin van de eerstvolgende kalendermaand, continuerend aan het begin van de kalendermaand, gedurende een periode van 3 maanden. De betalingstermijn bedraagt 14 dagen na factuurdatum.
• Intellectueel eigendomsrecht van de geleverde creaties gaat over op Opdrachtgever nadat betaling heeft plaatsgevonden.
• Beide partijen verplichten zich tot geheimhouding van vertrouwelijke informatie.
• Opdrachtnemer is uitsluitend aansprakelijk voor schade die door hem wordt aangebracht aan eigendommen van Opdrachtgever, voor zover die gedekt zijn door de verzekering die Opdrachtnemer daar voor heeft afgesloten. Beroepsaansprakelijkheid is uitdrukkelijk uitgesloten. Op verzoek zal Opdrachtnemer inzage geven in de polis en de algemene voorwaarden van de verzekering.
• Nederlands recht is van toepassing.
• Algemene voorwaarden zijn van toepassing.`,

    en: `• After the first delivery of content (V1) there is room for feedback, which is processed into a second version (V2). After V2 there is one final round of feedback to arrive at the definitive version (V3).
• This quotation assumes one recording session of no more than 4 hours. Recordings take place on location, on dates and at times agreed in advance. Travel costs are not included.
• Work outside the agreed scope, or outside the agreed block of time, is treated as additional work and is invoiced, after consultation, at the standard agency fee of €90 per hour, excluding VAT.
• Invoicing takes place at the agreed rates upon acceptance (set-up) and thereafter at the start of the following calendar month, continuing at the start of each calendar month for a period of 3 months. Payment is due within 14 days of the invoice date.
• Intellectual property rights to the delivered creations transfer to the Client once payment has been received.
• Both parties undertake to keep confidential information confidential.
• The Contractor is liable only for damage caused by the Contractor to property of the Client, and only to the extent covered by the insurance the Contractor has taken out for this purpose. Professional liability is expressly excluded. On request, the Contractor will provide access to the policy and the insurer's terms and conditions.
• Dutch law applies.
• Our general terms and conditions apply.`
};

/* Altijd een geldige taal terug. Een onbekende of ontbrekende waarde wordt
   Nederlands: dat is wat de zevenentwintig bestaande offertes zijn, en het is
   beter een offerte in de verkeerde taal te tonen dan een pagina vol
   `undefined`. */
function offerteTaal(waarde) {
    return OFFERTE_TALEN.indexOf(waarde) !== -1 ? waarde : 'nl';
}

function offerteTekst(taal) {
    return OFFERTE_TEKST[offerteTaal(taal)];
}

function offerteVoorwaarden(taal) {
    return OFFERTE_VOORWAARDEN[offerteTaal(taal)];
}

/* Mag ik de voorwaarden vervangen als iemand van taal wisselt?

   Alleen als er niets eigens in staat. Wie zijn voorwaarden heeft aangepast en
   daarna per ongeluk op EN klikt, raakt anders werk kwijt dat hij niet kan
   terughalen. Leeg of letterlijk de standaardtekst van een van beide talen
   betekent: hier is niets aan gedaan, vervangen mag. */
function magVoorwaardenVervangen(huidig) {
    const tekst = String(huidig == null ? '' : huidig).trim();
    if (!tekst) return true;
    return OFFERTE_TALEN.some(t => tekst === OFFERTE_VOORWAARDEN[t].trim());
}

/* Geld en datum volgen de taal van de offerte. Een Engelse offerte met
   "€ 1.234,56" leest voor een Britse of Amerikaanse ontvanger als iets meer dan
   duizend euro én als iets meer dan één euro, afhankelijk van hoe hij het leest.
   De munt blijft euro: dat is wat er betaald wordt. */
function offerteBedrag(waarde, taal) {
    const n = Number(waarde) || 0;
    return new Intl.NumberFormat(offerteTekst(taal).locale,
        { style: 'currency', currency: 'EUR' }).format(n);
}

function offerteDatum(waarde, taal) {
    if (!waarde) return '';
    const d = new Date(waarde);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(offerteTekst(taal).locale,
        { day: 'numeric', month: 'long', year: 'numeric' });
}

/* De voorwaarden opdelen in punten (05-10-2026).

   Stond eerst twee keer apart, in de PDF en op de ondertekenpagina, en allebei
   deden ze `terms.replace(/\n/g,' ').split(/(?=•)/)`. Dat gooit eerst ELKE
   regelovergang weg en splitst dan op een teken dat er niet hoeft te staan.
   Gevolg bij een echte offerte: veertien zelfgeschreven punten, elk op een
   eigen regel met een streepje ervoor, werden één bullet met alle streepjes
   middenin de lopende tekst. De standaardvoorwaarden ontkwamen eraan omdat die
   toevallig met `•` beginnen.

   Nu splitst hij op een regelovergang OF een bullet, en haalt daarna het
   lijstteken weg. Allebei de notaties werken dus, en ze mogen door elkaar. Het
   staat hier en niet in de twee renderplekken, want die liepen al uit elkaar. */
function offerteVoorwaardenLijst(tekst) {
    return String(tekst || '')
        .split(/\r?\n|(?=•)/)
        // Bullet, streepje, en- of kastlijntje of sterretje vooraan weghalen.
        .map(r => r.replace(/^\s*[••\-–—*]\s*/, '').trim())
        .filter(Boolean);
}

/* Opties in een offerte (08-10-2026).

   Een offerte zonder opties verandert hier niets van: `opties` is dan een lege
   lijst en `offerteGroepen` geeft alleen de gedeelde regels terug, precies zoals
   het altijd was.

   Met opties hangt elke regel via `item.optie` aan een optie-id. Een regel
   ZONDER `optie` is gedeeld en telt mee in ELKE optie: dat is de setupfee of de
   strategiesessie die je altijd levert, welk pakket de klant ook kiest. Zo hoef
   je die regel niet in elke optie te herhalen, en kan hij ook niet per optie uit
   de pas gaan lopen.

   Deze functies staan hier en niet in de vier renderplekken (modal, lade, PDF,
   ondertekenpagina), want dat is precies hoe het bij de voorwaarden misging: vier
   kopieën van dezelfde logica, en de klant tekent voor een ander document dan jij
   bewaart. */
function offerteOpties(quote) {
    const rauw = (quote && quote.opties) || [];
    if (!Array.isArray(rauw)) return [];
    return rauw
        .filter(o => o && o.id)
        .map(o => ({ id: String(o.id), naam: String(o.naam || '').trim() }));
}

function offerteHeeftOpties(quote) {
    return offerteOpties(quote).length > 0;
}

/* Welke datum staat er op de offerte (13-10-2026).

   Tot nu toe was dat `created_at`, en dat is wanneer de RIJ is gemaakt. Laat je
   een concept een paar dagen liggen, dan draagt het document een datum van voor
   het moment dat je het verstuurde, en aanpassen kon niet.

   `offertedatum` is het veld dat je zelf zet. Leeg betekent terugvallen op
   `created_at`, zodat alle offertes van voor deze datum tonen wat ze altijd
   toonden en er geen migratie nodig is. **`created_at` overschrijven we niet**:
   dat registreert wanneer de rij is gemaakt, en dat is iets anders. */
function offerteDatumVan(quote) {
    if (!quote) return '';
    return quote.offertedatum || quote.created_at || '';
}

/* Lege regels horen niet in het document (13-10-2026).

   Het formulier begint met één lege regel, want anders zie je geen tabel. Die
   regel heeft geen optie, telt dus als gedeeld, en werd daarmee in ELKE optie
   herhaald: op een echte offerte stond in beide opties een rij met "-", 1 en
   € 0,00. Zonder opties viel het niet op, want dan staat hij er één keer en lijkt
   het een regel die je nog moet invullen.

   Een regel is leeg als hij géén omschrijving heeft ÉN nul kost. Allebei, niet
   een van beide:
   - wél een omschrijving en € 0 is iets wat je meelevert ("Kickoff, kosteloos")
     en hoort er juist te staan;
   - géén omschrijving maar wél een bedrag is slordig, maar het is geld: dat
     stilletjes weglaten zou het totaal veranderen zonder dat iemand het ziet.

   Gebruiken: in de drie DOCUMENTplekken (lade, PDF, ondertekenpagina) en bij het
   opslaan. NIET in de modal zelf — daar moet een verse lege regel blijven staan,
   anders kun je er niet in typen. */
/* WAT EEN REGEL KOST, EN DE ENIGE PLEK WAAR DAT WORDT UITGEREKEND.

   Een regel rekent op twee manieren (23-10-2026):
   - `stuks` (standaard, en wat er staat als `rekenwijze` ontbreekt): aantal maal
     stuksprijs. Alle offertes van vóór deze datum vallen hieronder, dus die
     bewegen niet mee en er was geen migratie nodig.
   - `commissie`: een percentage over een grondslag. Daarmee kun je een
     resultaatvergoeding aanbieden naast een vaste fee, als twee opties.

   **Gebruik alleen een commissie met een grondslag die vastligt**, zoals een
   afgesproken advertentiebudget. Een percentage over omzet of over het aantal
   leads is op het moment van tekenen een aanname, en dan staat er een bedrag in
   het totaal dat niemand heeft toegezegd. Zoiets hoort in de voorwaarden, niet
   in de kostentabel. `sign_quote_by_token` legt dit bedrag namelijk vast.

   Afronden gebeurt op centen: `basis * pct` eerst, dan delen. Andersom levert
   10% over € 333,33 een bedrag met vier decimalen op dat nergens optelt. */
function offerteRegelBedrag(item) {
    if (!item) return 0;
    if (item.rekenwijze === 'commissie') {
        const pct = Number(item.percentage) || 0;
        const basis = Number(item.grondslag) || 0;
        return Math.round(basis * pct) / 100;
    }
    return (Number(item.qty) || 0) * (Number(item.unit_price) || 0);
}

/* De omschrijving zoals die op het DOCUMENT hoort te staan. Bij een commissie
   plakken we de berekening erachter, want "Resultaatvergoeding — € 500" zonder
   het percentage is niet te controleren door degene die tekent.

   Bewust niet in de kolommen Aantal en Stuksprijs: "Stuksprijs € 5.000" boven
   een advertentiebudget leest verkeerd, en die koppen staan op vier plekken. */
function offerteRegelOmschrijving(item, taal) {
    const tekst = String(item && item.description || '');
    if (!item || item.rekenwijze !== 'commissie') return tekst;
    const T = offerteTekst(taal);
    const pct = Number(item.percentage) || 0;
    const basis = offerteBedrag(Number(item.grondslag) || 0, taal);
    const haakjes = `${pct}% ${T.commissieOver} ${basis}`;
    return tekst ? `${tekst} (${haakjes})` : haakjes;
}

/* HET AANTAL MET ZIJN EENHEID (#119).

   Er stond "20" en nergens stond of dat uren, berichten, posts of maanden
   waren. Op een document dat iemand ondertekent hoort dat er wel te staan, en
   het is ook de reden dat "/mnd" achter de stuksprijs zo lang onopgemerkt bleef
   (#118): zonder eenheid valt niet te zien waar het achtervoegsel bij hoort.

   Eén plek, want de kolom Aantal wordt op vier plekken getekend: de lade, de
   PDF, de ondertekenpagina en het formulier. Bij een commissie staat hier een
   streepje -- daar is het percentage de inhoud en dat staat in de omschrijving.

   De eenheid is vrije tekst en mag leeg zijn: dan staat er alleen het getal,
   precies zoals op elke offerte van voor deze datum. Geen migratie nodig. */
function offerteAantalTekst(item, streepje) {
    const weg = streepje || '—';
    if (!item) return weg;
    if (item.rekenwijze === 'commissie') return weg;
    const aantal = item.qty == null || item.qty === '' ? 1 : item.qty;
    /* ONTSMETTEN GEBEURT HIER, niet bij het tonen. De eenheid is vrije tekst van
       een medewerker en komt onder meer op de publieke ondertekenpagina terecht.
       Op vier renderplekken vertrouwen op een escape is precies hoe dat soort dingen
       uiteen loopt; één filter op de bron kan niet vergeten worden.

       Wat overblijft is wat een eenheid kan zijn: letters, cijfers, een punt,
       een schuine streep en een koppelteken. "uur", "mnd", "m2", "stuks",
       "posts/mnd". Hoogstens twintig tekens, want langer is geen eenheid meer
       maar een omschrijving, en die heeft zijn eigen kolom. */
    const eenheid = String(item.eenheid || '')
        .replace(/[^\p{L}\p{N}./\- ]/gu, '')
        .trim()
        .slice(0, 20);
    return eenheid ? `${aantal} ${eenheid}` : String(aantal);
}

function offerteGevuldeRegels(items) {
    return (Array.isArray(items) ? items : []).filter(i => {
        const tekst = String(i && i.description || '').trim();
        return tekst !== '' || offerteRegelBedrag(i) !== 0;
    });
}

function offerteGroepen(items, opties) {
    const alle = Array.isArray(items) ? items : [];
    const lijst = Array.isArray(opties) ? opties.filter(o => o && o.id) : [];
    const ids = lijst.map(o => String(o.id));

    // Een regel met een optie die niet (meer) bestaat telt als gedeeld. Anders
    // verdwijnt hij stil uit het document nadat iemand een optie weghaalt.
    const gedeeld = alle.filter(i => !i.optie || ids.indexOf(String(i.optie)) === -1);

    return {
        gedeeld,
        groepen: lijst.map((o, i) => {
            const eigen = alle.filter(x => String(x.optie) === String(o.id));
            return {
                id: String(o.id),
                naam: o.naam || `Optie ${i + 1}`,
                eigen,
                // Wat deze optie werkelijk kost: het gedeelde deel hoort erbij.
                items: gedeeld.concat(eigen)
            };
        })
    };
}

/* De bedragen van een set regels. Stond vier keer apart; met opties zou dat
   acht keer worden. `btwTarief` is een percentage (21), niet een breuk. */
function offerteBedragen(items, btwTarief) {
    const regels = Array.isArray(items) ? items : [];
    const tarief = (Number(btwTarief) || 21) / 100;
    const som = soort => regels
        .filter(i => (i.type || 'eenmalig') === soort)
        .reduce((s, i) => s + offerteRegelBedrag(i), 0);

    const eenmaligSub = som('eenmalig');
    const maandSub = som('per_maand');
    /* PER RESULTAAT TELT NIET MEE IN HET TOTAAL (23-10-2026).

       Hoeveel resultaten er komen weet niemand op het moment van tekenen. Tel
       je zo'n regel toch mee, dan staat er een bedrag in het totaal dat niemand
       heeft toegezegd — en `sign_quote_by_token` legt dat bedrag vast als
       waarvoor getekend is.

       Let op dat `som()` hierboven filtert op de twee andere soorten, dus
       `subtotaal`, `btw` en `totaal` sluiten deze regels AL uit. Dit getal is
       er puur om ze te kunnen tonen. */
    const resultaatSub = som('per_resultaat');
    const eenmaligBtw = eenmaligSub * tarief;
    const maandBtw = maandSub * tarief;

    return {
        eenmaligSub, eenmaligBtw, eenmaligTotaal: eenmaligSub + eenmaligBtw,
        maandSub, maandBtw, maandTotaal: maandSub + maandBtw,
        resultaatSub,
        subtotaal: eenmaligSub + maandSub,
        btw: eenmaligBtw + maandBtw,
        totaal: eenmaligSub + maandSub + eenmaligBtw + maandBtw
    };
}

/* Wat zetten we in `quotes.total` als er opties zijn? De waarde staat dan pas
   vast als de klant kiest, dus elk getal is een aanname. We nemen de LAAGSTE:
   dat is een "vanaf"-bedrag en belooft niets te veel. Na ondertekening telt
   `gekozen_optie_bedrag`, want dan is het geen aanname meer.

   Een maandbedrag en een eenmalig bedrag zijn niet optelbaar tot één getal dat
   ergens op slaat; voor het vergelijken van opties doen we het hier wel, want
   het gaat alleen om "welke is de kleinste". */
function offerteVergelijkBedrag(bedragen) {
    return bedragen.eenmaligTotaal + bedragen.maandTotaal * 12;
}
// </offertetaal>

// De publieke ondertekenpagina laadt dit bestand als gewoon script, net als de
// app. Geen modules: `offerte.html` heeft geen bundelstap en draait alles inline.
if (typeof window !== 'undefined') {
    window.OFFERTE_TEKST = OFFERTE_TEKST;
    window.OFFERTE_VOORWAARDEN = OFFERTE_VOORWAARDEN;
    window.offerteTaal = offerteTaal;
    window.offerteTekst = offerteTekst;
    window.offerteVoorwaarden = offerteVoorwaarden;
    window.magVoorwaardenVervangen = magVoorwaardenVervangen;
    window.offerteBedrag = offerteBedrag;
    window.offerteDatum = offerteDatum;
    window.offerteVoorwaardenLijst = offerteVoorwaardenLijst;
    window.offerteOpties = offerteOpties;
    window.offerteHeeftOpties = offerteHeeftOpties;
    window.offerteGroepen = offerteGroepen;
    window.offerteGevuldeRegels = offerteGevuldeRegels;
    window.offerteRegelBedrag = offerteRegelBedrag;
    window.offerteRegelOmschrijving = offerteRegelOmschrijving;
    window.offerteAantalTekst = offerteAantalTekst;
    window.offerteDatumVan = offerteDatumVan;
    window.offerteBedragen = offerteBedragen;
    window.offerteVergelijkBedrag = offerteVergelijkBedrag;
}
