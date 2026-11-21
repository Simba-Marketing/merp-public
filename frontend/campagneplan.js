/* ============================================
   CAMPAGNEPLAN — Marketing > Campagnes
   ============================================

   Een plan, geen verslag. Hier leg je vast wat je van plan bent: op welk
   platform, met welk budget, in welke periode en regio, met welk aanbod. De
   bestaande tabel `campaigns` houdt bij wat er daadwerkelijk gebeurde; die twee
   apart houden is het hele punt, anders kun je achteraf niet meer zien wat doel
   was en wat uitkomst.

   Waarom niet tien losse KPI-velden
   ---------------------------------
   De gevraagde cijfers hangen samen. Geef je budget en CPC, dan liggen clicks
   vast. Met CTR volgen de vertoningen, met CVR de leads, en daarmee de CPL. Tien
   invulvakjes leveren dus tien getallen op die elkaar kunnen tegenspreken.

   Daarom vraagt dit scherm alleen wat je zelf kiest of inschat:

       budget, CPC, CTR, CVR, afspraakratio, sluitingsratio, prijs

   en rekent de rest door:

       clicks      = budget / CPC
       vertoningen = clicks / CTR
       leads       = clicks * CVR
       CPL         = budget / leads
       afspraken   = leads * afspraakratio
       deals       = afspraken * sluitingsratio
       omzet       = deals * prijs
       ROAS        = omzet / budget

   Laat je een aanname leeg, dan stopt de keten daar en tonen we een streepje.
   Een verzonnen standaardwaarde zou een plan opleveren dat er compleet uitziet
   maar nergens op steunt.
*/

const CAMPAGNEPLAN = {

    plannen: [],
    klanten: [],
    formulieren: [],      // lead_intake_forms; hier hangt de campagne aan
    leadsPerPlan: {},     // hoeveel leads er werkelijk binnenkwamen per plan
    bewerkt: null,        // het plan dat openstaat, of null bij een nieuw plan
    _gestart: false,

    PLATFORMS: ['Meta', 'Google Ads', 'LinkedIn', 'TikTok', 'YouTube',
                'Pinterest', 'Microsoft Ads', 'E-mail', 'Overig'],

    STATUSSEN: [
        { k: 'concept',  label: 'Concept' },
        { k: 'actief',   label: 'Actief' },
        { k: 'afgerond', label: 'Afgerond' },
        { k: 'gestopt',  label: 'Gestopt' }
    ],

    VELDEN: ['naam', 'platform', 'status', 'client_id', 'ad_spend', 'start_datum',
             'eind_datum', 'regio', 'targeting', 'offer', 'prijs', 'cpc', 'ctr',
             'cvr', 'meeting_rate', 'closing_rate', 'notities', 'form_key'],

    /* ---------- rekenen ---------- */

    /* Geeft de hele keten terug. Elke waarde is een getal of null; null betekent
       dat een aanname ontbreekt en dat we het dus niet weten. */
    reken(p) {
        const g = v => {
            const n = parseFloat(v);
            return (v === null || v === undefined || v === '' || Number.isNaN(n)) ? null : n;
        };
        const spend = g(p.ad_spend);
        const cpc   = g(p.cpc);
        const ctr   = g(p.ctr);
        const cvr   = g(p.cvr);
        const mr    = g(p.meeting_rate);
        const cr    = g(p.closing_rate);
        const prijs = g(p.prijs);

        const clicks      = (spend != null && cpc)            ? spend / cpc          : null;
        const vertoningen = (clicks != null && ctr)           ? clicks / (ctr / 100) : null;
        const leads       = (clicks != null && cvr != null)   ? clicks * (cvr / 100) : null;
        const cpl         = (spend != null && leads)          ? spend / leads        : null;
        const afspraken   = (leads != null && mr != null)     ? leads * (mr / 100)   : null;
        const deals       = (afspraken != null && cr != null) ? afspraken * (cr / 100) : null;
        const omzet       = (deals != null && prijs != null)  ? deals * prijs        : null;
        const roas        = (omzet != null && spend)          ? omzet / spend        : null;

        return { spend, cpc, ctr, cvr, mr, cr, prijs,
                 clicks, vertoningen, leads, cpl, afspraken, deals, omzet, roas };
    },

    /* ---------- opmaak ---------- */

    euro(v, decimalen) {
        if (v == null) return '&mdash;';
        const d = decimalen || 0;
        return '&euro; ' + v.toLocaleString('nl-NL',
            { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    getal(v) { return v == null ? '&mdash;' : Math.round(v).toLocaleString('nl-NL'); },
    procent(v) { return v == null ? '&mdash;' : v.toFixed(1).replace('.', ',') + '%'; },
    ratio(v) { return v == null ? '&mdash;' : v.toFixed(2).replace('.', ',') + 'x'; },

    veilig(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    periodeTekst(p) {
        const f = d => d ? new Date(d).toLocaleDateString('nl-NL',
            { day: 'numeric', month: 'short', year: 'numeric' }) : null;
        const a = f(p.start_datum), b = f(p.eind_datum);
        if (a && b) return a + ' t/m ' + b;
        if (a) return 'vanaf ' + a;
        if (b) return 'tot ' + b;
        return 'geen periode';
    },

    /* ---------- laden ---------- */

    async laad() {
        try {
            const [pl, kl, fm, ld] = await Promise.all([
                sb.from('campaign_plans').select('*').order('created_at', { ascending: false }),
                sb.from('clients').select('id, companyName, client_number').order('companyName'),
                sb.from('lead_intake_forms').select('form_key, label, client_id, campaign_plan_id'),
                sb.from('campaign_leads').select('campaign_plan_id')
            ]);
            if (pl.error) throw pl.error;
            this.plannen = pl.data || [];
            this.klanten = kl.data || [];
            this.formulieren = fm.data || [];

            // Werkelijke leads per plan. Zo staat naast wat je verwachtte ook
            // wat er echt binnenkwam, en dat is het hele doel van de koppeling.
            this.leadsPerPlan = {};
            (ld.data || []).forEach(l => {
                if (!l.campaign_plan_id) return;
                this.leadsPerPlan[l.campaign_plan_id] = (this.leadsPerPlan[l.campaign_plan_id] || 0) + 1;
            });
        } catch (err) {
            console.error('Campagneplannen laden mislukt:', err);
            this.plannen = [];
        }
        this.teken();
        this.vulKeuzelijsten();
    },

    // Het formulier dat nu aan dit plan hangt, of niets.
    formulierVan(planId) {
        return this.formulieren.find(f => f.campaign_plan_id === planId) || null;
    },

    klantNaam(id) {
        if (!id) return 'Eigen marketing';
        const k = this.klanten.find(x => x.id === id);
        return k ? k.companyName : 'Onbekende klant';
    },

    /* ---------- lijst ---------- */

    teken() {
        const el = document.getElementById('cpLijst');
        if (!el) return;

        if (!this.plannen.length) {
            el.innerHTML = '<div class="cp-leeg"><p>Nog geen campagneplan. Maak er een om '
                + 'budget, aanbod en verwachte opbrengst naast elkaar te zetten voordat je '
                + 'live gaat.</p><button type="button" class="btn btn-primary" '
                + 'data-cp-nieuw>Nieuw campagneplan</button></div>';
            el.querySelectorAll('[data-cp-nieuw]').forEach(b =>
                b.addEventListener('click', () => this.open()));
            return;
        }

        el.innerHTML = this.plannen.map(p => {
            const r = this.reken(p);
            const st = this.STATUSSEN.find(s => s.k === p.status) || this.STATUSSEN[0];
            return '<article class="cp-kaart">'
                + '<header class="cp-kaart-kop"><div>'
                +   '<h3 class="cp-kaart-titel">' + this.veilig(p.naam) + '</h3>'
                +   '<p class="cp-kaart-sub">' + this.veilig(p.platform)
                +     ' &middot; ' + this.veilig(this.klantNaam(p.client_id))
                +     ' &middot; ' + this.periodeTekst(p)
                +     (p.regio ? ' &middot; ' + this.veilig(p.regio) : '') + '</p>'
                + '</div><span class="cp-status cp-status-' + st.k + '">' + st.label + '</span></header>'
                + (p.offer ? '<p class="cp-offer">' + this.veilig(p.offer)
                    + (p.prijs != null ? ' <span class="cp-prijs">' + this.euro(Number(p.prijs))
                        + '</span>' : '') + '</p>' : '')
                + '<div class="cp-kpis">'
                +   this.kpi('Ad spend', this.euro(r.spend))
                +   this.kpi('Leads', this.leadsKpi(p, r))
                +   this.kpi('CPL', this.euro(r.cpl, 2))
                +   this.kpi('Afspraken', this.getal(r.afspraken))
                +   this.kpi('Omzet', this.euro(r.omzet))
                +   this.kpi('ROAS', this.ratio(r.roas))
                + '</div>'
                + (this.formulierVan(p.id)
                    ? '<p class="cp-formulier"><span class="material-icons-outlined">link</span> Leads komen binnen via '
                      + this.veilig(this.formulierVan(p.id).label || this.formulierVan(p.id).form_key) + '</p>'
                    : '')
                + '<footer class="cp-kaart-voet">'
                +   '<button type="button" class="btn btn-secondary btn-sm" data-cp-open>Bewerken</button>'
                +   '<button type="button" class="btn btn-ghost btn-sm" data-cp-weg>Verwijderen</button>'
                + '</footer></article>';
        }).join('');

        // Handlers via de lijst in plaats van onclick in de markup: dan hoeft er
        // geen id door een tekenreeks heen, en kan er dus ook niets in stukgaan.
        el.querySelectorAll('.cp-kaart').forEach((kaart, i) => {
            const plan = this.plannen[i];
            kaart.querySelector('[data-cp-open]').addEventListener('click', () => this.open(plan.id));
            kaart.querySelector('[data-cp-weg]').addEventListener('click', () => this.verwijder(plan.id));
        });
    },

    /* Leads is het enige getal waar we werkelijkheid naast plan zetten. Staat er
       geen formulier aan de campagne, dan is er niets te meten en tonen we
       alleen de verwachting; anders zou een nul lijken op tegenvallen terwijl er
       simpelweg niets gekoppeld is. */
    leadsKpi(p, r) {
        const gepland = this.getal(r.leads);
        const form = this.formulierVan(p.id);
        if (!form) return gepland;
        const echt = this.leadsPerPlan[p.id] || 0;
        return echt + ' <span class="cp-kpi-plan">/ ' + gepland + '</span>';
    },

    kpi(label, waarde) {
        return '<div class="cp-kpi"><span class="cp-kpi-label">' + label
             + '</span><span class="cp-kpi-waarde">' + waarde + '</span></div>';
    },

    /* ---------- formulier ---------- */

    open(id) {
        this.bewerkt = id ? this.plannen.find(p => p.id === id) || null : null;
        const p = this.bewerkt || {};

        this.vulKeuzelijsten();
        this.VELDEN.forEach(veld => {
            const e = document.getElementById('cp_' + veld);
            if (!e) return;
            const w = p[veld];
            e.value = (w === null || w === undefined) ? '' : w;
        });
        if (!this.bewerkt) {
            const st = document.getElementById('cp_status');
            if (st) st.value = 'concept';
        }
        const fm = document.getElementById('cp_form_key');
        if (fm) {
            const huidige = this.bewerkt ? this.formulierVan(this.bewerkt.id) : null;
            fm.value = huidige ? huidige.form_key : '';
        }

        const titel = document.getElementById('cpFormTitel');
        if (titel) titel.textContent = this.bewerkt ? 'Campagneplan bewerken' : 'Nieuw campagneplan';
        const fout = document.getElementById('cpFout');
        if (fout) { fout.textContent = ''; fout.hidden = true; }

        const form = document.getElementById('cpForm');
        if (form) form.hidden = false;
        this.herbereken();
        const eerste = document.getElementById('cp_naam');
        if (eerste) setTimeout(() => eerste.focus(), 30);
    },

    sluit() {
        const f = document.getElementById('cpForm');
        if (f) f.hidden = true;
        this.bewerkt = null;
    },

    lees() {
        const v = veld => {
            const e = document.getElementById('cp_' + veld);
            return e ? String(e.value).trim() : '';
        };
        const num = veld => {
            const w = v(veld);
            if (w === '') return null;
            const n = parseFloat(w.replace(',', '.'));
            return Number.isNaN(n) ? null : n;
        };
        return {
            naam: v('naam'),
            platform: v('platform'),
            status: v('status') || 'concept',
            client_id: v('client_id') || null,
            ad_spend: num('ad_spend') || 0,
            start_datum: v('start_datum') || null,
            eind_datum: v('eind_datum') || null,
            regio: v('regio') || null,
            targeting: v('targeting') || null,
            offer: v('offer') || null,
            prijs: num('prijs'),
            cpc: num('cpc'),
            ctr: num('ctr'),
            cvr: num('cvr'),
            meeting_rate: num('meeting_rate'),
            closing_rate: num('closing_rate'),
            notities: v('notities') || null
        };
    },

    // form_key hoort niet bij het plan zelf maar bij het formulier, dus die
    // lezen we apart uit en schrijven we naar lead_intake_forms.
    leesFormulier() {
        const e = document.getElementById('cp_form_key');
        return e ? e.value : '';
    },

    /* Rekent mee terwijl je typt, zodat je ziet wat een aanname doet in plaats
       van te moeten opslaan om erachter te komen. */
    herbereken() {
        const r = this.reken(this.lees());
        const zet = (id, tekst) => {
            const e = document.getElementById(id);
            if (e) e.innerHTML = tekst;
        };
        zet('cpUitVertoningen', this.getal(r.vertoningen));
        zet('cpUitClicks', this.getal(r.clicks));
        zet('cpUitLeads', this.getal(r.leads));
        zet('cpUitCpl', this.euro(r.cpl, 2));
        zet('cpUitAfspraken', this.getal(r.afspraken));
        zet('cpUitDeals', this.getal(r.deals));
        zet('cpUitOmzet', this.euro(r.omzet));
        zet('cpUitRoas', this.ratio(r.roas));

        // ROAS onder de één betekent dat je er geld op toelegt. Dat is het enige
        // getal hier waar kleur iets zegt, dus het enige dat kleurt.
        const roas = document.getElementById('cpUitRoas');
        if (roas) {
            roas.classList.toggle('is-goed', r.roas != null && r.roas >= 1);
            roas.classList.toggle('is-slecht', r.roas != null && r.roas < 1);
        }
    },

    async bewaar() {
        const rij = this.lees();
        const fout = document.getElementById('cpFout');
        const meld = t => { if (fout) { fout.textContent = t; fout.hidden = false; } };

        if (!rij.naam) return meld('Geef de campagne een naam.');
        if (!rij.platform) return meld('Kies een platform.');
        if (rij.start_datum && rij.eind_datum && rij.eind_datum < rij.start_datum) {
            return meld('De einddatum ligt voor de startdatum.');
        }

        const knop = document.getElementById('cpBewaar');
        if (knop) { knop.disabled = true; knop.textContent = 'Bezig...'; }

        try {
            const res = this.bewerkt
                ? await sb.from('campaign_plans').update(rij).eq('id', this.bewerkt.id).select()
                : await sb.from('campaign_plans').insert(rij).select();
            if (res.error) throw res.error;

            // Het gekozen formulier aan dit plan hangen. Eerst losmaken wat er
            // eerder aan hing: een campagne kan maar door een formulier gevoed
            // worden, anders lopen de leads alsnog door elkaar.
            const planId = this.bewerkt ? this.bewerkt.id : (res.data && res.data[0] && res.data[0].id);
            const gekozen = this.leesFormulier();
            if (planId) {
                const huidige = this.formulierVan(planId);
                if (huidige && huidige.form_key !== gekozen) {
                    await sb.from('lead_intake_forms')
                        .update({ campaign_plan_id: null }).eq('form_key', huidige.form_key);
                }
                if (gekozen) {
                    await sb.from('lead_intake_forms')
                        .update({ campaign_plan_id: planId }).eq('form_key', gekozen);
                }
            }

            this.sluit();
            await this.laad();
        } catch (err) {
            console.error('Opslaan mislukt:', err);
            meld('Opslaan is niet gelukt: ' + (err.message || err));
        } finally {
            if (knop) { knop.disabled = false; knop.textContent = 'Opslaan'; }
        }
    },

    async verwijder(id) {
        const p = this.plannen.find(x => x.id === id);
        if (!p) return;
        if (!confirm('Campagneplan "' + p.naam + '" verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
        try {
            const { error } = await sb.from('campaign_plans').delete().eq('id', id);
            if (error) throw error;
            await this.laad();
        } catch (err) {
            console.error('Verwijderen mislukt:', err);
            alert('Verwijderen is niet gelukt: ' + (err.message || err));
        }
    },

    /* ---------- start ---------- */

    vulKeuzelijsten() {
        const plat = document.getElementById('cp_platform');
        if (plat && !plat.options.length) {
            plat.innerHTML = '<option value="">Kies een platform</option>'
                + this.PLATFORMS.map(p => '<option value="' + p + '">' + p + '</option>').join('');
        }
        const st = document.getElementById('cp_status');
        if (st && !st.options.length) {
            st.innerHTML = this.STATUSSEN.map(s =>
                '<option value="' + s.k + '">' + s.label + '</option>').join('');
        }
        const fm = document.getElementById('cp_form_key');
        if (fm) {
            fm.innerHTML = '<option value="">Geen formulier gekoppeld</option>'
                + this.formulieren.map(f => '<option value="' + this.veilig(f.form_key) + '">'
                    + this.veilig(f.label || f.form_key) + '</option>').join('');
        }

        const kl = document.getElementById('cp_client_id');
        if (kl && kl.options.length <= 1) {
            kl.innerHTML = '<option value="">Eigen marketing</option>'
                + this.klanten.map(k => '<option value="' + this.veilig(k.id) + '">'
                    + this.veilig(k.companyName) + '</option>').join('');
        }
    },

    async start() {
        if (!document.getElementById('cpLijst')) return;
        if (!this._gestart) {
            const knop = (id, fn) => {
                const e = document.getElementById(id);
                if (e) e.addEventListener('click', fn);
            };
            knop('cpNieuw', () => this.open());
            knop('cpAnnuleer', () => this.sluit());
            knop('cpBewaar', () => this.bewaar());

            const form = document.getElementById('cpForm');
            if (form) form.addEventListener('input', () => this.herbereken());

            this._gestart = true;
        }
        await this.laad();
    }
};
