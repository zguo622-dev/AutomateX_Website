/* ============================================================================
   Build HTML Report — v2 (2026-05-11)
   --------------------------------------------------------------------------
   Renders the AI Readiness Assessment PDF report against the new Claude JSON
   schema. Five pillars (Hero Dependency, Expertise Leverage, Continuous
   Improvement, First-Time Approval, AI Readiness). New Three Ways Forward
   recommendation (CPD / Workshop / Build). PACED method retired.

   Downstream nodes also consume the `insights` field on this node's output
   (Notify Bill email, Email PDF to Lead body), so the schema is the contract.
   ========================================================================== */

const webhook = $('Scorecard Webhook').first().json.body;
const claudeResponse = $json;

/* ------- Em-dash sanitiser (defensive, even though the prompt forbids them) ------- */
function stripEmDash(value) {
  if (typeof value === 'string') {
    return value.replace(/\s*[—–]\s*/g, '. ').replace(/\.\s*\.\s*/g, '. ');
  }
  if (Array.isArray(value)) return value.map(stripEmDash);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = stripEmDash(value[k]);
    return out;
  }
  return value;
}

/* ------- Parse Claude output, fall back if malformed ------- */
let insights;
try {
  const content = claudeResponse.text || (claudeResponse.content && claudeResponse.content[0].text) || JSON.stringify(claudeResponse);
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  insights = stripEmDash(JSON.parse(cleaned));
} catch (e) {
  insights = {
    headline: 'Your AI Readiness Report',
    overallVerdict: {
      maturityLevel: 'Structured',
      summary: 'Your assessment results have been recorded. Our team will review and follow up with personalised insights shortly.'
    },
    pillarInterpretations: {
      'Hero Dependency': 'How much of delivery depends on one or two key people.',
      'Expertise Leverage': 'How much of your senior time becomes output.',
      'Continuous Improvement': 'Whether each project makes your firm sharper.',
      'First-Time Approval': 'How often deliverables pass first submission.',
      'AI Readiness': 'Whether your tenders can evidence AI rather than promise it.'
    },
    weakestPillars: [
      {
        pillar: 'First-Time Approval', score: 0,
        diagnosis: 'Analysis pending. Our team will review your results.',
        painConnection: 'Margin walking out. Every rework cycle compounds.',
        actionThisQuarter: 'Audit your last three Cat 3 cycles for repeat patterns.'
      },
      {
        pillar: 'Hero Dependency', score: 0,
        diagnosis: 'Analysis pending. Our team will review your results.',
        painConnection: 'Hero dependency. Two people carrying the firm.',
        actionThisQuarter: 'Map every workflow your two most senior engineers touch this week.'
      }
    ],
    strongestPillar: {
      pillar: 'AI Readiness', score: 0,
      celebration: 'You showed initiative by completing this assessment. That puts you ahead of most firms.',
      leverageAdvice: 'Use this momentum to take the first concrete step toward an AI-enabled team.'
    },
    quickWin: 'Book a strategy call to walk through your results and pick a first move.',
    journeyNarrative: 'Your assessment results have been recorded. Book a strategy call to walk through your personalised roadmap.',
    threeWaysForward: {
      recommended: 'workshop',
      recommendationRationale: 'Based on your profile, a structured Workshop is the cleanest way to find your X.',
      cpd: 'Right for teams who want to learn the AI-in-rail landscape before committing.',
      workshop: 'Right for teams who want a hosted diagnose with a tailored Find Your X report.',
      build: 'Right for teams who already know their X and want to move.'
    },
    qualificationScore: 5,
    talkingPoints: ['Review assessment results', 'Discuss priorities', 'Propose roadmap']
  };
}

/* ------- Webhook field extraction ------- */
const name = webhook.name || 'Valued Client';
const company = webhook.company || '';
const role = webhook.role || '';
const email = webhook.email || '';
const overallScore = webhook.overallScore || 0;
const pillarScores = webhook.pillarScores || {};
const cohort = webhook.cohort || 'warm';
const maturity = (insights.overallVerdict && insights.overallVerdict.maturityLevel) || 'Structured';
const today = new Date();
const reportDate = today.getDate() + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][today.getMonth()] + ' ' + today.getFullYear();

const maturityColours = {
  'Reactive': '#ED4A3B',
  'Structured': '#F59E0B',
  'Optimised': '#10B981',
  'Systemised': '#3B82F6'
};
const maturityColour = maturityColours[maturity] || '#F59E0B';

/* ------- Pillar metadata for the bar chart and interpretations ------- */
const pillarOrder = ['Hero Dependency', 'Expertise Leverage', 'Continuous Improvement', 'First-Time Approval', 'AI Readiness'];
const pillarConcepts = {
  'Hero Dependency': 'Resilience',
  'Expertise Leverage': 'Throughput',
  'Continuous Improvement': 'Learning',
  'First-Time Approval': 'Quality',
  'AI Readiness': 'Competitiveness'
};

/* ------- Helper renderers ------- */
function scoreBar(score, label) {
  const w = Math.max(score, 5);
  const concept = pillarConcepts[label] || '';
  const interp = (insights.pillarInterpretations && insights.pillarInterpretations[label]) || '';
  return '<div style="page-break-inside:avoid;break-inside:avoid;margin-bottom:22px;">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
      '<span style="font-family:Montserrat,sans-serif;font-weight:600;font-size:14px;color:#FFF;">' + label + ' <span style="font-weight:400;font-size:11px;color:#9CA3AF;">(' + concept + ')</span></span>' +
      '<span style="font-family:Open Sans,sans-serif;font-weight:700;font-size:14px;color:#F96532;">' + score + '%</span>' +
    '</div>' +
    '<div style="background:rgba(249,101,50,0.15);border-radius:6px;height:12px;overflow:hidden;margin-bottom:6px;">' +
      '<div style="background:linear-gradient(90deg,#FB7B3A,#ED4A3B);width:' + w + '%;height:100%;border-radius:6px;"></div>' +
    '</div>' +
    (interp ? '<div style="font-family:Open Sans,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.5;font-style:italic;">' + interp + '</div>' : '') +
  '</div>';
}

function opportunityCard(pillarData, num) {
  return '<div style="page-break-inside:avoid;background:rgba(255,255,255,0.02);border-radius:12px;padding:32px;margin-bottom:24px;border:1px solid rgba(249,101,50,0.15);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<div><span style="font-family:Montserrat,sans-serif;font-weight:800;font-size:20px;color:#FFF;">' + pillarData.pillar + '</span><span style="font-family:Open Sans,sans-serif;font-size:13px;color:#F96532;margin-left:12px;font-weight:600;">OPPORTUNITY ' + num + '</span></div>' +
      '<div style="background:rgba(249,101,50,0.15);border-radius:20px;padding:6px 16px;"><span style="font-family:Montserrat,sans-serif;font-weight:700;font-size:16px;color:#F96532;">' + pillarData.score + '%</span></div>' +
    '</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:14px;color:#E5E7EB;line-height:1.7;margin-bottom:20px;">' + pillarData.diagnosis + '</div>' +
    '<div style="background:rgba(237,74,59,0.08);border-left:3px solid #ED4A3B;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:20px;">' +
      '<div style="font-family:Montserrat,sans-serif;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#ED4A3B;margin-bottom:6px;">Pain Connection</div>' +
      '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#E5E7EB;line-height:1.6;">' + pillarData.painConnection + '</div>' +
    '</div>' +
    '<div style="background:rgba(16,185,129,0.05);border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:14px 18px;">' +
      '<div style="font-family:Montserrat,sans-serif;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#10B981;margin-bottom:6px;">Action This Quarter</div>' +
      '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#E5E7EB;line-height:1.6;">' + pillarData.actionThisQuarter + '</div>' +
    '</div>' +
  '</div>';
}

function wayForwardCard(key, title, subtitle, body, isRecommended, ctaText, ctaHref) {
  const accent = isRecommended ? '#F96532' : 'rgba(255,255,255,0.12)';
  const bg = isRecommended ? 'rgba(249,101,50,0.08)' : 'rgba(255,255,255,0.02)';
  const badge = isRecommended ? '<div style="display:inline-block;background:#F96532;color:#FFF;font-family:Montserrat,sans-serif;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:2px;padding:4px 10px;border-radius:100px;margin-bottom:12px;">Recommended for you</div>' : '';
  const btnBg = isRecommended ? 'background:linear-gradient(135deg,#FB7B3A,#ED4A3B);color:#FFFFFF;border:1px solid transparent;' : 'background:transparent;color:#F96532;border:1px solid rgba(249,101,50,0.45);';
  return '<div style="page-break-inside:avoid;break-inside:avoid;background:' + bg + ';border-radius:12px;padding:24px;margin-bottom:14px;border:1px solid ' + accent + ';">' +
    badge +
    '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:17px;color:#FFF;margin-bottom:4px;">' + title + '</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:12px;color:#F96532;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">' + subtitle + '</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#E5E7EB;line-height:1.7;margin-bottom:18px;">' + body + '</div>' +
    '<a href="' + ctaHref + '" style="display:inline-block;' + btnBg + 'font-family:Montserrat,sans-serif;font-weight:700;font-size:12px;text-decoration:none;padding:10px 22px;border-radius:6px;text-transform:uppercase;letter-spacing:1px;">' + ctaText + '</a>' +
  '</div>';
}

/* ------- Section composition ------- */
const pillarBars = pillarOrder.map(function(p) { return scoreBar(pillarScores[p] || 0, p); }).join('');

const weakPillarCards = (insights.weakestPillars || []).map(function(p, i) {
  return opportunityCard(p, i + 1);
}).join('');

const strongest = insights.strongestPillar || {};
const strongestCard = '<div style="page-break-inside:avoid;background:rgba(16,185,129,0.05);border-radius:12px;padding:24px 28px;margin-bottom:32px;border:1px solid rgba(16,185,129,0.2);">' +
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<div><span style="font-family:Montserrat,sans-serif;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#10B981;">Your Strength</span><div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#FFF;margin-top:4px;">' + (strongest.pillar || '') + '</div></div>' +
    '<div style="background:rgba(16,185,129,0.15);border-radius:20px;padding:6px 16px;"><span style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;color:#10B981;">' + (strongest.score || 0) + '%</span></div>' +
  '</div>' +
  '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#E5E7EB;line-height:1.7;margin-bottom:10px;">' + (strongest.celebration || '') + '</div>' +
  '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#9CA3AF;line-height:1.6;font-style:italic;">' + (strongest.leverageAdvice || '') + '</div>' +
'</div>';

/* ------- Three Ways Forward ------- */
const tw = insights.threeWaysForward || {};
const recommended = (tw.recommended || 'workshop').toLowerCase();
const cpdCard = wayForwardCard('cpd', '1-hour CPD', '£300, £250 with Assessment', tw.cpd || '', recommended === 'cpd', 'Book the CPD', 'https://calendly.com/bill-guo-automatex/cpd');
const workshopCard = wayForwardCard('workshop', 'Find Your X Workshop', '£1,800, £1,500 with Assessment', tw.workshop || '', recommended === 'workshop', 'Book the Workshop', 'https://calendly.com/bill-guo-automatex/automatex-find-your-x-workshop');
const buildCard = wayForwardCard('build', 'Build Engagement', 'Outcome-priced, custom-scoped', tw.build || '', recommended === 'build', 'Discuss a Build', 'https://calendly.com/bill-guo-automatex/discovery-chat');

/* ------- HTML report ------- */
const html =
'<!DOCTYPE html><html><head><meta charset="UTF-8">' +
'<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">' +
'<style>html,body{margin:0;padding:0;background:#0D1117;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{font-family:Open Sans,sans-serif;color:#E5E7EB;orphans:3;widows:3;}.page{padding:48px 56px;background:#0D1117;}p,div{orphans:3;widows:3;}</style>' +
'</head><body>' +

'<div class="page">' +

  /* === COVER === */
  '<div style="background:#1A1F36;border-radius:16px;padding:40px 44px;margin-bottom:32px;border-top:4px solid #F96532;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">' +
      '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:26px;color:#FFF;text-transform:uppercase;letter-spacing:1px;">AI Readiness <span style="color:#F96532;">Report</span></div>' +
      '<img src="https://automatex.uk/brand_assets/Logo.png" alt="AutomateX" style="width:120px;height:auto;max-height:60px;object-fit:contain;" />' +
    '</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#9CA3AF;margin-bottom:24px;">Prepared for <strong style="color:#FFF;">' + name + '</strong>' + (role ? ', ' + role : '') + (company ? ' at <strong style="color:#FFF;">' + company + '</strong>' : '') + ' &middot; ' + reportDate + '</div>' +
    '<div style="display:flex;align-items:center;gap:24px;">' +
      '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:72px;color:#F96532;line-height:1;">' + overallScore + '<span style="font-size:24px;color:#9CA3AF;">/100</span></div>' +
      '<div>' +
        '<div style="display:inline-block;background:' + maturityColour + ';color:#FFF;font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:2px;padding:6px 14px;border-radius:100px;margin-bottom:10px;">' + maturity + '</div>' +
        '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:18px;color:#FFF;line-height:1.4;max-width:380px;">&ldquo;' + (insights.headline || '') + '&rdquo;</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  /* === OVERALL VERDICT === */
  '<div style="background:rgba(255,255,255,0.02);border-radius:12px;padding:28px 32px;margin-bottom:32px;border-left:3px solid #F96532;">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:12px;">Where You Stand</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:15px;color:#E5E7EB;line-height:1.7;">' + (insights.overallVerdict && insights.overallVerdict.summary || '') + '</div>' +
  '</div>' +

  /* === PILLAR BREAKDOWN === */
  '<div style="background:rgba(255,255,255,0.02);border-radius:12px;padding:32px;margin-bottom:32px;">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:24px;page-break-after:avoid;break-after:avoid;">Your Five-Pillar Breakdown</div>' +
    pillarBars +
  '</div>' +

  /* === STRONGEST PILLAR === */
  strongestCard +

  /* === WEAKEST PILLAR OPPORTUNITIES === */
  '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:20px;">Your Two Biggest Opportunities</div>' +
  weakPillarCards +

  /* === QUICK WIN === */
  '<div style="page-break-inside:avoid;background:linear-gradient(135deg,rgba(249,101,50,0.12),rgba(237,74,59,0.06));border-radius:12px;padding:28px 32px;margin-bottom:32px;border:1px solid rgba(249,101,50,0.25);">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:12px;">Your Quick Win This Week</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:15px;color:#FFF;line-height:1.7;">' + (insights.quickWin || '') + '</div>' +
  '</div>' +

  /* === JOURNEY NARRATIVE === */
  '<div style="page-break-inside:avoid;break-inside:avoid;background:rgba(255,255,255,0.02);border-radius:12px;padding:32px;margin-bottom:32px;">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:20px;">Your AI Transformation Story</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:14px;color:#E5E7EB;line-height:1.8;white-space:pre-line;">' + (insights.journeyNarrative || '') + '</div>' +
  '</div>' +

  /* === THREE WAYS FORWARD === */
  '<div style="margin-bottom:32px;">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#F96532;margin-bottom:8px;">Three Ways Forward</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:13px;color:#9CA3AF;line-height:1.6;margin-bottom:20px;">Not steps. Options. Pick the one that fits where you are. ' + (tw.recommendationRationale || '') + '</div>' +
    cpdCard +
    workshopCard +
    buildCard +
  '</div>' +

  /* === CLOSER + CTA === */
  '<div style="page-break-inside:avoid;text-align:center;padding:36px 24px;background:rgba(249,101,50,0.05);border-radius:12px;border:1px solid rgba(249,101,50,0.25);margin-bottom:24px;">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:22px;color:#FFF;margin-bottom:12px;">Ready to find your X?</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:14px;color:#9CA3AF;line-height:1.6;margin-bottom:24px;">A 30-minute call to walk through this report together and pick the option that fits.</div>' +
    '<a href="https://calendly.com/bill-guo-automatex/discovery-chat" style="display:inline-block;background:linear-gradient(135deg,#FB7B3A,#ED4A3B);color:white;font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;text-decoration:none;padding:16px 44px;border-radius:8px;text-transform:uppercase;letter-spacing:1px;">Book Your Discovery Call</a>' +
  '</div>' +

  /* === FOOTER === */
  '<div style="text-align:center;padding:20px 0;border-top:1px solid rgba(255,255,255,0.05);">' +
    '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;color:#FFF;margin-bottom:4px;">AutomateX</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:11px;color:#9CA3AF;font-style:italic;margin-bottom:8px;">Where rail domain expertise meets AI.</div>' +
    '<div style="font-family:Open Sans,sans-serif;font-size:10px;color:#4B5563;">Personalised report generated from the AutomateX AI Readiness Assessment.</div>' +
  '</div>' +

'</div></body></html>';

/* ------- Per-page running header (Puppeteer headerTemplate) -------
   Renders inside the top page margin on EVERY page. Bridges page breaks
   visually so the dark theme stays continuous. Inline SVG for the logo
   (external images often fail to load in Puppeteer headers). Visible band
   sits in the top of the margin; the rest is empty dark space as
   breathing room before content begins. */
/* Real AutomateX brand logo, 44x44 PNG, base64-inlined. Puppeteer's header
   sandbox refuses to wait for external image URLs, so the URL approach
   shows a broken image icon. Base64 inline avoids the network fetch
   entirely and uses the same brand mark. */
const logoSvg =
  '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAFk0lEQVRYw+2YT6ycVRnGf+/5vm9m7m07pVAF/xBuE91iadASRU03pmkgmBhIdIfNtW2iO/GWpGls8Rbc0OKmLnSj3chKEiEgMSAaaN0AthsLpZTaSi0t9A937sx33vdxMXPvrSHkTuntRufZTCY53zm/88zzvnPOByONNNJII430vywbZpDvXg91TrTH12Ppm2Q/Th1PY1wudrx8VQv6A1/AP/Vp8HyLsA0EHeV4gZQutH51aNHn02IDOgf2wbImrBi/i2S/M/Qoxm8o7BF63vZddw0NW9+/hvqGVag7OyHs12AHhD2Jpd26ONvofO+OawduPvdTrNUEaQPSrfIQoQbSDynTzzRbt/OOLy+6UPe+NfjK1ZB9Qlbul7NJWYarUnAPVXUzlq4dWOdnoCzBo4kLQhASQYnYZlU5TTfaefudHztH7/7b0I03QZ0noNhPsBGXcKEs8DiqiAsS1w4cgLkgov8lAKcPLkqwrVTlo3hamae+8pHn8wNfxMdXI/cJWbFfwUZlSVkoy8hxUHV+iCJdtA8uLoHDEmgAqnmHnVA92EAJbFGyx9SLG+ofL0D37l1D3WxD9oGzthFHcpDL1IedpCiP6MwZxp55Y1HgkmEsDg1ggcCI+KdyPGWp2KxgOUGBmMQsaaa3vfejde+nk+foLbsRPCZIgxjMbV4YEYdwn6Qsj3D2PMuePzlU4S7u8CAG+m/wmm73CWXfTWhG/ZgUyDZTlD9XJ6+q2zehOiaktF9hG9V3VnJMOQ6pzpMqqiM6e5bx544N3WnKoUbFwF2bg5chelya2aexsYTSToJxOQVh36eoFJ16f6jcY9hGDM07qzhEzpPWaB7W6VMs/8vpq+rjiwPriiIzzRWbCFBZ1Jrp7KUaA9lOvA+tsAdpVJs0w2cVkpkBMpMOEXmSojqsc+9dNezQDmvgsIz5HM+3oCh7zM7uVdGASDvVd7qygs9biXwWzGRmOojyJFXzCGf/zYqXTnyiv+Y0VNGJhU4RVxRiiMYvX0fZenQ6jyvHNE49iJBSaViBReZlOZudsSOcO/eJYYdz2K8ANM1lGMIGu4DIhiklQWO+UNVvg0VlJOMYOU5iNStefOuaDj9puAxrvlvMFaBcyKH74FqS0aJqTmFpiqAikAIjsMGevitLe9T19sVNa68vsGzgqIO8754GrssNFC0V1ZRIDxO0FJIccL0l59JgbIlsm1I5rZ7aF751x3UEHsRCg8z2zxODn72nhsrqJ5C247TkEo4hvYTi28raTehD9ccXKG1VqqZ9Vu33N6y7PsCpDjR3fph3WJLTUtmcQulhhVoKNIjAi4b9ANJhcv0LuXYRfEgYCiultFVFYzp3ab93953XwWEZ9A8q87nFaWCNh8C2K2jJB7ChP+F5UspHSysJL3rk/ISydsuZUUAMoEmN6XrW2u+uX7+0wIbNQc59SmGfE2mznHG5roTdoiK9mS5dovnk31j57Gt613rR7e4L165wZuR9p0PFVorGntxN7VPrvrp0wDkHij60FgqvICjmYiDxPNIWGs1jXPqAsWcWWteqF17Hc+rF7My+Bafn4lFsoaimc7b2O2vvXqq2ZuAQYfRzuHAYUmAKniW0ReIYVrLsD8c/MsXqv/4d92bPZzt7w/WI3PrQslIqtpGaO+pMdfz2ry9Bhlvj+EwNbt0Fhw05RvA0oa1K6bidP8/4b1/52HluPvgqKpb3hPaGmJboSIYoClnxHUvlZ8QSXJHGpw4Ql7vI+XPUnJabRTZT8JSkbYITKRWM//HtRRe75ZWDuFfdMD3uwWOSdYQBdhTpAkNckYa65l++73aoe4kV7W8I7hGcMcUBUvEv/eME7VffvapKP/Glr2H4WKTWvaK4jYjfq2y+UV04xa1vHh69fBlppJFGGun/WP8B2AnMKLP8KaYAAAAASUVORK5CYII=" width="22" height="22" alt="" style="width:22px;height:22px;vertical-align:middle;display:inline-block;border:0;outline:0;" />';

const headerTemplate =
  '<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;width:100%;height:100%;margin:0;padding:0;box-sizing:border-box;background:#0D1117;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;">' +
    /* Visible slim band at top of margin */
    '<div style="height:14mm;border-bottom:2px solid #F96532;background:#0D1117;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="height:100%;width:100%;border-collapse:collapse;">' +
        '<tr>' +
          '<td valign="middle" style="padding:0 14mm;width:50%;">' +
            logoSvg +
            '<span style="display:inline-block;margin-left:10px;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#FFFFFF;vertical-align:middle;">AI READINESS <span style="color:#F96532;">REPORT</span></span>' +
          '</td>' +
          '<td valign="middle" align="right" style="padding:0 14mm;width:50%;font-size:7pt;color:#9CA3AF;">' +
            'Prepared for <strong style="color:#FFFFFF;">' + name + '</strong> &middot; Score <span style="color:#F96532;font-weight:bold;">' + overallScore + '/100</span> &middot; <span style="background:' + maturityColour + ';color:#FFFFFF;font-weight:bold;padding:2px 6px;border-radius:4px;">' + maturity.toUpperCase() + '</span>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</div>' +
    /* Empty dark breathing room below visible header band — generous so content has clear separation from the orange line on every page */
    '<div style="background:#0D1117;height:21mm;font-size:1px;line-height:1px;">&nbsp;</div>' +
  '</div>';

/* Tiny footer with page numbers + AutomateX URL */
const footerTemplate =
  '<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;width:100%;height:100%;background:#0D1117;color:#4B5563;font-family:Arial,Helvetica,sans-serif;font-size:7pt;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="height:100%;width:100%;border-collapse:collapse;">' +
      '<tr>' +
        '<td valign="middle" align="center" style="color:#6B7280;">' +
          'automatex.uk &middot; Page <span class="pageNumber"></span> of <span class="totalPages"></span>' +
        '</td>' +
      '</tr>' +
    '</table>' +
  '</div>';

/* ------- Internal Q&A audit HTML for the Notify Bill email -------
   Iterates over every response captured in the webhook and renders one
   row per question. Pillar questions get an orange tag and a score,
   qualifier questions get a grey tag, free-text gets rendered with
   newlines preserved. */
const responses = webhook.responses || [];
const responseTableHtml = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-collapse:collapse;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;">' +
  responses.map(function(r, i) {
    var num = (i + 1);
    var tag = '';
    if (r.pillar) {
      tag = '<span style="display:inline-block;background:#FB7B3A;color:#FFFFFF;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;letter-spacing:1px;text-transform:uppercase;margin-right:8px;vertical-align:middle;">' + r.pillar + '</span>';
    } else if (r.qualify) {
      tag = '<span style="display:inline-block;background:#6B7280;color:#FFFFFF;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;letter-spacing:1px;text-transform:uppercase;margin-right:8px;vertical-align:middle;">' + r.qualify + '</span>';
    }
    var scoreTag = (r.score !== undefined && r.score !== null)
      ? '<span style="display:inline-block;background:#FEF3F2;color:#F96532;font-weight:bold;font-size:11px;padding:2px 8px;border-radius:3px;margin-left:8px;vertical-align:middle;">' + r.score + '%</span>'
      : '';
    var answer = r.answer || r.selected || '<em style="color:#999;">(no answer)</em>';
    if (typeof answer === 'string') answer = answer.split('\n').join('<br>');
    return '<tr>' +
      '<td style="padding:12px 8px 12px 14px;border-bottom:1px solid #E5E7EB;vertical-align:top;width:32px;font-size:11px;color:#9CA3AF;font-weight:bold;">' + num + '.</td>' +
      '<td style="padding:12px 14px 12px 0;border-bottom:1px solid #E5E7EB;vertical-align:top;">' +
        '<div style="margin-bottom:6px;line-height:1.4;">' + tag + '<span style="font-size:12px;font-weight:bold;color:#1A1F36;">' + r.question + '</span>' + scoreTag + '</div>' +
        '<div style="font-size:13px;color:#444444;line-height:1.6;">' + answer + '</div>' +
      '</td>' +
    '</tr>';
  }).join('') +
'</table>';

return {
  html: html,
  headerTemplate: headerTemplate,
  footerTemplate: footerTemplate,
  insights: insights,
  responseTableHtml: responseTableHtml,
  fileName: 'AI Readiness Report ' + name.replace(/[—–]/g, ' ').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() + '.pdf',
  recipientName: name,
  recipientEmail: email
};
