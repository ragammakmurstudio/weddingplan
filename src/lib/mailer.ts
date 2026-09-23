import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER / SMTP_PASS belum di-set");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Reset Password NikahPlan",
    text: [
      "Kamu meminta reset password NikahPlan.",
      "",
      `Buka link ini untuk membuat password baru (berlaku30 menit, sekali pakai):`,
      resetUrl,
      "",
      "Kalau bukan kamu yang minta, abaikan email ini — tidak ada yang berubah.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#334155">
        <h2 style="color:#e11d48;margin-bottom:8px">Reset Password NikahPlan</h2>
        <p>Kamu meminta reset password akun NikahPlan kamu.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${resetUrl}"
             style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600">
            Buat Password Baru
          </a>
        </p>
        <p style="font-size:13px;color:#94a3b8">
          Link berlaku30 menit dan hanya bisa dipakai sekali. Kalau bukan kamu yang
          meminta, abaikan email ini.
        </p>
        <p style="font-size:13px;color:#94a3b8">${resetUrl}</p>
      </div>`,
  });
}
