// Client-side mirror of the welcome email HTML (for preview only).
// Keep visually in sync with supabase/functions/send-bulk-welcome-email/index.ts

const LOGO_URL = "/favicon.png";
const WEBSITE_URL = "https://jainmandirparham.netlify.app";
const APP_URL = "https://www.indusappstore.com/apps/devotional/bada-jain-mandir-parham/com.parham.jainmandir/?page=details&id=com.parham.jainmandir";

export const buildWelcomeEmailPreview = (name = "Devotee") => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f1e7;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(184,134,11,0.15);border:1px solid #f0e0b6;">
  <tr><td style="background:linear-gradient(135deg,#b8860b 0%,#daa520 50%,#b8860b 100%);padding:32px 24px;text-align:center;">
    <img src="${LOGO_URL}" alt="Mandir" width="72" height="72" style="border-radius:50%;background:#fff;padding:6px;margin-bottom:12px;" />
    <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;letter-spacing:0.5px;">🙏 Jai Jinendra</h1>
    <p style="margin:6px 0 0;font-size:14px;color:#fff8dc;">Shri Parshwanath Digambar Bada Jain Mandir, Parham</p>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0;font-size:17px;color:#1f2937;">Dear <strong style="color:#b8860b;">${name}</strong>,</p>
    <p style="margin:14px 0 0;font-size:15px;color:#374151;line-height:1.75;">
      🌸 Aap sabhi ka humare mandir parivar mein hardik swagat hai! Bhagwan Parshwanath ki kripa aap par sada bani rahe, aur aapke jeevan mein sukh, shanti aur samriddhi ka vaas ho.
    </p>
    <p style="margin:14px 0 0;font-size:15px;color:#374151;line-height:1.75;">
      Hum aapko yeh yaad dilana chahte hain ki humari mandir ki official website par aap darshan, events, donations, aur live darshan sabhi kuch aasani se dekh sakte hain.
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fff8dc 0%,#fef3c7 100%);border:2px solid #daa520;border-radius:12px;">
      <tr><td style="padding:22px;text-align:center;">
        <p style="margin:0 0 8px;font-size:20px;">📱✨</p>
        <h2 style="margin:0 0 6px;font-size:19px;color:#92400e;font-weight:700;">Mandir App Ab Available Hai!</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#78350f;line-height:1.6;">
          Indus App Store par humari official app download karein aur mandir se judi har update apne mobile par paayein.
        </p>
        <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(184,134,11,0.4);">
          📥 Download Now on Indus App Store
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#92400e;">Click karte hi aap seedha app page par pahunch jayenge.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
      <tr><td style="padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#166534;font-weight:700;">📋 App Install Karne Ke Baad Ke Steps:</h3>
        <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;line-height:1.9;">
          <tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">1.</td><td>App install hote hi <strong>apna account create karein</strong> (naam, mobile number ke sath).</td></tr>
          <tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">2.</td><td><strong>Notification ki permission "Allow"</strong> karein taaki mandir ke aarti, events aur pravachan ki suchna aap tak samay par pahunche.</td></tr>
          <tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">3.</td><td>Live darshan, donations aur gallery ka aanand lein — sab kuch ek hi jagah!</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px 20px;text-align:center;">
    <a href="${WEBSITE_URL}" style="display:inline-block;background:#1f2937;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-size:13px;font-weight:600;margin:4px;">🌐 Visit Website</a>
    <a href="${APP_URL}" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-size:13px;font-weight:600;margin:4px;">📱 Get the App</a>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf5;border:1px solid #f0e0b6;border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <h3 style="margin:0 0 12px;font-size:14px;color:#92400e;font-weight:700;letter-spacing:0.3px;">💬 Sampark / Contact</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding:4px 6px 4px 0;">
              <a href="mailto:badajainmandirparham@gmail.com" style="display:block;background:linear-gradient(135deg,#fff8dc,#fef3c7);border:1px solid #daa520;color:#78350f;text-decoration:none;padding:12px 14px;border-radius:10px;font-size:12px;font-weight:600;text-align:center;">
                📧 Support<br/><span style="font-size:11px;font-weight:500;color:#92400e;word-break:break-all;">badajainmandirparham@gmail.com</span>
              </a>
            </td>
            <td width="50%" style="padding:4px 0 4px 6px;">
              <a href="tel:+916399003541" style="display:block;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #6366f1;color:#312e81;text-decoration:none;padding:12px 14px;border-radius:10px;font-size:12px;font-weight:600;text-align:center;">
                👨‍💻 Developer<br/><span style="font-size:11px;font-weight:500;color:#4338ca;">Arpan Jain · +91 6399003541</span>
              </a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#1f2937;padding:22px 28px;text-align:center;">
    <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;">🙏 Bhagwan Parshwanath ki kripa aap par bani rahe 🙏</p>
    <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">Shri Parshwanath Digambar Bada Jain Mandir, Parham, Uttar Pradesh</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:10px;">© ${new Date().getFullYear()} All rights reserved · Developed by <span style="color:#fbbf24;">Arpan Jain (AJ001)</span></p>
  </td></tr>
</table></td></tr></table></body></html>`;
