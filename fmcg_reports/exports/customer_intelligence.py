"""
Customer Intelligence Engine
- Segment customers by RFM
- Generate targeted promotion messages (SMS, WhatsApp, Email)
- Identify inactive/at-risk/high-value customers
- Birthday & anniversary triggers
"""
from datetime import datetime, date

STORE_NAME  = "RetailWizard Store"
STORE_PHONE = "your store number"

# ── Message Templates ─────────────────────────────────────────────
TEMPLATES = {
    "INACTIVE": {
        "sms": "Hi {name}, we miss you at {store}! It's been {days} days. Come back & enjoy {offer}% off on your next visit. Valid till {expiry}. Show this msg at billing.",
        "whatsapp": "🙏 Dear *{name}*,\n\nWe haven't seen you in a while and we miss you!\n\n🎁 *Special Come-Back Offer*\n✅ *{offer}% discount* on your next visit\n📅 Valid till: *{expiry}*\n\nWe look forward to seeing you again at *{store}*!\n\nCall us: {phone}",
        "email_subject": "We Miss You, {name}! Here's a Special Offer 🎁",
        "email_body": """Dear {name},

We noticed it's been a while since your last visit and we truly miss you!

🎁 As a token of appreciation, here's a special come-back offer:

✅ {offer}% OFF on your next purchase
📅 Valid till: {expiry}

Just show this email at the billing counter.

We look forward to welcoming you back!

Warm regards,
{store} Team
📞 {phone}"""
    },

    "BIRTHDAY": {
        "sms": "Happy Birthday {name}! 🎂 {store} wishes you a wonderful day! Enjoy a special {offer}% Birthday Discount today. Show this msg at billing. Have a great day!",
        "whatsapp": "🎂 *Happy Birthday, {name}!* 🎉\n\nWishing you a day full of joy and happiness!\n\n🎁 *Birthday Special Offer*\n✅ *{offer}% discount* on today's purchase\n📅 Valid today only!\n\nCome celebrate with us at *{store}*! 🥳\n\n📞 {phone}",
        "email_subject": "🎂 Happy Birthday {name}! Your Birthday Gift Inside",
        "email_body": """🎂 Happy Birthday, {name}!

On your special day, {store} wants to make it even more memorable!

🎁 Your Birthday Gift:
✅ {offer}% OFF on your purchase today
📅 Valid on your birthday only

Just visit us and show this email. Wishing you a wonderful year ahead!

With love,
{store} Team 🎉"""
    },

    "LOYAL": {
        "sms": "Hi {name}, you're one of our most valued customers! Enjoy exclusive {offer}% loyalty discount on your next visit to {store}. You deserve it! Valid: {expiry}",
        "whatsapp": "⭐ Dear *{name}*,\n\nYou are one of our *most valued customers* and we truly appreciate your loyalty!\n\n🏆 *VIP Loyalty Reward*\n✅ *{offer}% exclusive discount*\n📅 Valid till: *{expiry}*\n\nThank you for being with us! 🙏\n\n*{store}* | 📞 {phone}",
        "email_subject": "⭐ Thank You {name} – Exclusive VIP Offer For You",
        "email_body": """Dear {name},

You are among our most loyal customers and we want to say THANK YOU!

⭐ Your Loyalty Reward:
✅ {offer}% EXCLUSIVE discount on your next purchase
📅 Valid till: {expiry}

Your continued trust means the world to us.

Gratefully yours,
{store} Team"""
    },

    "BULK_BUYER": {
        "sms": "Hi {name}! As a bulk buyer at {store}, you qualify for a special trade discount. Get {offer}% off on bulk orders above Rs.{min_amount}. Call {phone} or visit us!",
        "whatsapp": "📦 Dear *{name}*,\n\nYou qualify for our *Bulk Buyer Special Program*!\n\n💼 *Trade Discount Offer*\n✅ *{offer}% off* on orders above ₹{min_amount}\n📋 Special pricing on selected categories\n\n📞 Call us for bulk pricing: {phone}\n\n*{store}*",
        "email_subject": "📦 Bulk Buyer Special Discount – {name}",
        "email_body": """Dear {name},

Based on your purchase history, you qualify for our exclusive Bulk Buyer program!

💼 Trade Discount Details:
✅ {offer}% off on orders above ₹{min_amount}
✅ Priority stock reservation
✅ Dedicated relationship manager

Call us at {phone} or visit {store} to know more.

Best regards,
{store} Trade Team"""
    },

    "FESTIVAL": {
        "sms": "Happy {festival}! 🎉 {name}, celebrate with {store}! Get {offer}% off on all purchases. Offer valid: {expiry}. Shop now & celebrate the season!",
        "whatsapp": "🎉 *Happy {festival}!* 🎊\n\nDear *{name}*,\n\nMay this {festival} bring joy, prosperity, and happiness to you and your family!\n\n🛍️ *Festival Special Offer*\n✅ *{offer}% OFF* on all purchases\n📅 Valid till: *{expiry}*\n\nCelebrate with *{store}*! 🙏\n📞 {phone}",
        "email_subject": "🎉 Happy {festival}! Special Festival Offer for {name}",
        "email_body": """Dear {name},

Warm wishes on the occasion of {festival}! 🎉

To make your celebrations extra special, here's a festival gift from {store}:

🎁 {offer}% OFF on all purchases
📅 Valid till: {expiry}

Wishing you and your family a joyous {festival}!

{store} Team 🙏"""
    },

    "POINTS_REMINDER": {
        "sms": "Hi {name}, you have {points} loyalty points worth Rs.{value} at {store}! Redeem them on your next visit before {expiry}. Don't let them expire!",
        "whatsapp": "⭐ Dear *{name}*,\n\nYou have *{points} loyalty points* worth *₹{value}* at {store}!\n\n💡 *Redeem before they expire!*\n📅 Expiry: *{expiry}*\n\nVisit us and save on your next purchase! 🛍️\n\n📞 {phone}",
        "email_subject": "⭐ {name}, Your {points} Points Worth ₹{value} Are Waiting!",
        "email_body": """Dear {name},

Don't let your loyalty points go to waste!

You currently have {points} points worth ₹{value} at {store}.

📅 Please redeem before: {expiry}

Visit us and use your points to save on your next purchase!

{store} Loyalty Team"""
    }
}


def generate_message(template_key, customer_data, channel='whatsapp',
                      offer=10, festival=None, min_amount=5000):
    """
    Generate a targeted message for a customer.
    channel: 'sms' | 'whatsapp' | 'email'
    Returns: dict with subject (email only), body, channel
    """
    tmpl = TEMPLATES.get(template_key)
    if not tmpl: return {"error": f"Template {template_key} not found"}

    today = datetime.today()
    expiry = today.replace(day=min(today.day+14, 28)).strftime('%d/%m/%Y')

    name   = str(customer_data.get('CUSTOMER_NAME', 'Valued Customer')).split()[0].title()
    points = int(customer_data.get('LOYALTY_POINTS', 0))
    value  = round(points * 0.5, 0)  # 1 point = 0.5 Rs (adjust as needed)

    fill = {
        "name": name, "store": STORE_NAME, "phone": STORE_PHONE,
        "offer": offer, "expiry": expiry, "days": customer_data.get('DAYS_SINCE_LAST_VISIT', 0),
        "points": points, "value": value, "min_amount": f"{min_amount:,}",
        "festival": festival or "Festival"
    }

    result = {"channel": channel, "customer_code": customer_data.get('CUSTOMER_CODE')}

    if channel == 'email':
        result['subject'] = tmpl.get('email_subject','').format(**fill)
        result['body']    = tmpl.get('email_body','').format(**fill)
    elif channel == 'whatsapp':
        result['body'] = tmpl.get('whatsapp','').format(**fill)
    else:
        result['body'] = tmpl.get('sms','').format(**fill)

    return result


def bulk_generate_messages(df_segments, channel='whatsapp', festival=None):
    """
    Generate messages for an entire segment dataframe.
    Returns list of message dicts.
    """
    messages = []
    for _, row in df_segments.iterrows():
        seg = row.get('CUSTOMER_SEGMENT', 'REGULAR')
        days = int(row.get('DAYS_SINCE_LAST_VISIT', 0) or 0)
        pts  = int(row.get('LOYALTY_POINTS', 0) or 0)
        total= float(row.get('TOTAL_SPENT', 0) or 0)

        # Pick template + offer based on segment
        if seg == 'INACTIVE' or days > 180:
            key, offer = 'INACTIVE', 15
        elif seg == 'LOST' or days > 120:
            key, offer = 'INACTIVE', 10
        elif row.get('BIRTHDAY_THIS_WEEK', 0) == 1:
            key, offer = 'BIRTHDAY', 20
        elif seg in ['CHAMPION', 'LOYAL', 'HIGH VALUE']:
            key, offer = 'LOYAL', 12
        elif total >= 50000:
            key, offer = 'BULK_BUYER', 8
        elif pts > 100:
            key, offer = 'POINTS_REMINDER', 5
        elif festival:
            key, offer = 'FESTIVAL', 10
        else:
            continue  # Skip regular customers with no trigger

        msg = generate_message(key, row.to_dict(), channel, offer, festival)
        msg['segment']  = seg
        msg['mobile']   = row.get('MOBILE', '')
        msg['email']    = row.get('EMAIL', '')
        msg['template'] = key
        messages.append(msg)

    return messages


def get_segment_summary(df_segments):
    """Return count by segment for dashboard display"""
    if df_segments.empty: return {}
    return df_segments.groupby('CUSTOMER_SEGMENT').size().to_dict()
