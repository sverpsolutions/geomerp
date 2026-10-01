"""
Email Report Sender - Using SMTP (Gmail, from System.dat)
SMTP: smtp.gmail.com:587
From: retailwizardreports@gmail.com
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from db_config import get_secret

SMTP_SERVER   = 'smtp.gmail.com'
SMTP_PORT     = 587
SMTP_USER     = 'retailwizardreports@gmail.com'
SMTP_PASSWORD = get_secret('SMTP_PASSWORD')
FROM_EMAIL    = 'retailwizardreports@gmail.com'

def send_report_email(to_email, report_name, file_path_or_bytes=None, subject=None):
    """
    Send report via email.
    to_email : recipient email address
    report_name : name of the report (used in subject)
    file_path_or_bytes : optional path or bytes of file attachment
    """
    try:
        msg = MIMEMultipart()
        msg['From']    = FROM_EMAIL
        msg['To']      = to_email
        msg['Subject'] = subject or f'RetailWizard Report: {report_name} - {datetime.now().strftime("%d/%m/%Y")}'

        body = f"""
Dear User,

Please find attached the {report_name} report generated from RetailWizard FMCG Reporting System.

Report: {report_name}
Generated On: {datetime.now().strftime("%d/%m/%Y %I:%M %p")}

This is an automated email from RetailWizard Reporting Tool.
Please do not reply to this email.

Regards,
RetailWizard Reporting System
        """
        msg.attach(MIMEText(body, 'plain'))

        # Attach file if provided
        if file_path_or_bytes:
            if isinstance(file_path_or_bytes, bytes):
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(file_path_or_bytes)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename="{report_name}.pdf"')
                msg.attach(part)
            else:
                with open(file_path_or_bytes, 'rb') as f:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    filename = file_path_or_bytes.split('/')[-1]
                    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                    msg.attach(part)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        return f'Report sent successfully to {to_email}'
    except Exception as e:
        return f'Failed to send email: {str(e)}'


def send_daily_summary(to_email, summary_data):
    """Send automated daily sales summary."""
    try:
        msg = MIMEMultipart('alternative')
        msg['From']    = FROM_EMAIL
        msg['To']      = to_email
        msg['Subject'] = f"Daily Sales Summary - {datetime.now().strftime('%d/%m/%Y')}"

        html = f"""
<html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4;">
<div style="background:white;padding:24px;border-radius:8px;max-width:600px;margin:auto;">
  <h2 style="color:#1a4e8f;border-bottom:2px solid #f4a621;padding-bottom:8px;">
    RetailWizard - Daily Sales Summary
  </h2>
  <p style="color:#666;">Date: <b>{datetime.now().strftime('%d %B %Y')}</b></p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr style="background:#1a4e8f;color:white;">
      <th style="padding:10px;text-align:left;">Metric</th>
      <th style="padding:10px;text-align:right;">Value</th>
    </tr>
    <tr style="background:#f7f9fc;">
      <td style="padding:10px;">Total Bills</td>
      <td style="padding:10px;text-align:right;"><b>{summary_data.get('bill_count', 0)}</b></td>
    </tr>
    <tr>
      <td style="padding:10px;">Total Sales</td>
      <td style="padding:10px;text-align:right;"><b>Rs. {summary_data.get('total_sales', 0):,.2f}</b></td>
    </tr>
    <tr style="background:#f7f9fc;">
      <td style="padding:10px;">Total Discount</td>
      <td style="padding:10px;text-align:right;">Rs. {summary_data.get('total_discount', 0):,.2f}</td>
    </tr>
    <tr>
      <td style="padding:10px;">Avg Bill Value</td>
      <td style="padding:10px;text-align:right;">Rs. {summary_data.get('avg_bill', 0):,.2f}</td>
    </tr>
  </table>
  <p style="color:#999;font-size:12px;margin-top:20px;">
    This is an automated daily summary from RetailWizard Reporting Tool.
  </p>
</div>
</body></html>
"""
        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        return 'Daily summary sent successfully'
    except Exception as e:
        return f'Failed: {str(e)}'
