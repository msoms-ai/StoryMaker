import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'msoms.ai',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || 'qisas.admin@msoms.ai',
    pass: process.env.SMTP_PASS || '3&r6jHn28'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('[Email Service] SMTP connection notice:', error.message);
  } else {
    console.log('[Email Service] SMTP Server is ready to deliver messages via', process.env.SMTP_HOST);
  }
});

/**
 * Send 4-Digit OTP Code via Email
 */
export async function sendOtpEmail({ toEmail, otpCode, lang = 'ar', purpose = 'signup' }) {
  const fromTitle = lang === 'ar'
    ? process.env.SMTP_FROM_NAME_AR || 'منصة قصص - مسومس للذكاء الإصطناعي'
    : process.env.SMTP_FROM_NAME_EN || 'Qisas Platform by msoms.ai';
  
  const fromAddress = `"${fromTitle}" <${process.env.SMTP_FROM_EMAIL || 'qisas.admin@msoms.ai'}>`;

  const subject = lang === 'ar'
    ? `رمز التحقق الخاص بك في منصة قصص: ${otpCode}`
    : `Your Qisas Platform Verification Code: ${otpCode}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .logo-box { text-align: center; margin-bottom: 24px; }
        .logo-title { font-size: 26px; font-weight: 900; background: linear-gradient(135deg, #f59e0b, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; background: #fef3c7; color: #b45309; font-weight: 700; font-size: 13px; margin-top: 8px; }
        .otp-box { text-align: center; margin: 28px 0; padding: 20px; background: #f1f5f9; border-radius: 18px; border: 2px dashed #cbd5e1; }
        .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4f46e5; margin: 0; font-family: monospace; }
        .timer-notice { color: #dc2626; font-size: 13px; font-weight: bold; margin-top: 10px; }
        .footer { text-align: center; margin-top: 28px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-box">
          <h1 class="logo-title">${lang === 'ar' ? 'منصة قصص للذكاء الاصطناعي' : 'Qisas Story Platform'}</h1>
          <span class="badge">${purpose === 'email_change' ? (lang === 'ar' ? 'تأكيد البريد الإلكتروني الجديد' : 'Confirm New Email') : (lang === 'ar' ? 'تفعيل الحساب الجديد' : 'Account Activation')}</span>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6; text-align: ${lang === 'ar' ? 'right' : 'left'};">
          ${lang === 'ar'
            ? 'مرحباً بك في منصة قصص! يرجى استخدام رمز التحقق التالي لإتمام تفعيل حسابك والبدء في إنشاء وقراءة أروع القصص التفاعلية:'
            : 'Welcome to Qisas Platform! Please use the following 4-digit verification code to activate your account and start crafting stories:'}
        </p>

        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="timer-notice">
            ${lang === 'ar' ? '⏳ هذا الرمز صالح لمدة 5 دقائق فقط' : '⏳ This code expires in 5 minutes'}
          </div>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: ${lang === 'ar' ? 'right' : 'left'};">
          ${lang === 'ar'
            ? 'إذا لم تكن قد طلبت هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.'
            : 'If you did not request this verification code, please disregard this email.'}
        </p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} msoms.ai - ${lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      html: htmlContent
    });
    console.log(`[Email Service] OTP successfully sent to ${toEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Service] Failed to send OTP to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Teacher Upgrade Request Notification to Admin
 */
export async function sendTeacherRequestToAdmin({ userEmail, userName, schoolIdPath }) {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'qisas.admin@msoms.ai';
  const fromAddress = `"منصة قصص - تنبيه الإدارة" <${process.env.SMTP_FROM_EMAIL || 'qisas.admin@msoms.ai'}>`;

  const subject = `طلب ترقية إلى صانع قصص (معلم) جديد: ${userName} (${userEmail})`;

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">طلب ترقية جديد إلى صانع قصص (معلم) 🎓</h2>
      <p>قام المستخدم التالي بتقديم طلب ترقية حسابه إلى دور <strong>صانع القصص (Story Maker)</strong> مع إرفاق بطاقة المعلم المدرسية:</p>
      <ul>
        <li><strong>الاسم:</strong> ${userName}</li>
        <li><strong>البريد الإلكتروني:</strong> ${userEmail}</li>
        <li><strong>تاريخ الطلب:</strong> ${new Date().toLocaleString('ar-AE')}</li>
      </ul>
      <p>يرجى الدخول إلى لوحة تحكم الإدارة لمراجعة بطاقة المعلم المرفقة واتخاذ قرار الاعتماد أو الرفض.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: adminEmail,
      subject,
      html: htmlContent
    });
    console.log(`[Email Service] Admin notification sent to ${adminEmail}`);
  } catch (err) {
    console.warn(`[Email Service] Admin notification notice:`, err.message);
  }
}

/**
 * Send Package Purchase Receipt Email
 */
export async function sendPackagePurchaseEmail({ toEmail, packageName, storiesAdded, price, transactionId, lang = 'ar' }) {
  const fromTitle = lang === 'ar'
    ? process.env.SMTP_FROM_NAME_AR || 'منصة قصص - مسومس للذكاء الإصطناعي'
    : process.env.SMTP_FROM_NAME_EN || 'Qisas Platform by msoms.ai';
  
  const fromAddress = `"${fromTitle}" <${process.env.SMTP_FROM_EMAIL || 'qisas.admin@msoms.ai'}>`;
  const subject = lang === 'ar'
    ? `تأكيد شراء باقة: ${packageName} - منصة قصص`
    : `Package Purchase Confirmation: ${packageName} - Qisas Platform`;

  const htmlContent = `
    <div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #10b981;">${lang === 'ar' ? 'تمت عملية الدفع وإضافة الرصيد بنجاح! 🎉' : 'Payment Successful & Credits Added! 🎉'}</h2>
      <p>${lang === 'ar' ? 'شكراً لترقية حسابك في منصة قصص. إليك تفاصيل الباقة المضافة:' : 'Thank you for upgrading your account. Here are your package details:'}</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 16px 0;">
        <p><strong>${lang === 'ar' ? 'الباقة:' : 'Package:'}</strong> ${packageName}</p>
        <p><strong>${lang === 'ar' ? 'القصص المضافة:' : 'Stories Added:'}</strong> ${storiesAdded} ${lang === 'ar' ? 'قصة' : 'stories'}</p>
        <p><strong>${lang === 'ar' ? 'المبلغ المدفوع:' : 'Amount Paid:'}</strong> ${price} AED</p>
        <p><strong>${lang === 'ar' ? 'رقم المعاملة:' : 'Transaction ID:'}</strong> ${transactionId}</p>
      </div>
      <p>${lang === 'ar' ? 'يمكنك الآن البدء فوراً في تأليف وإنشاء قصص جديدة في أي وقت!' : 'You can now start crafting new interactive stories right away!'}</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      html: htmlContent
    });
  } catch (err) {
    console.warn(`[Email Service] Receipt email notice:`, err.message);
  }
}
