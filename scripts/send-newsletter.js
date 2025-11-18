// --- Part A: Importing Our Tools ---
const admin = require("firebase-admin");
const axios = require("axios");
const sgMail = require("@sendgrid/mail");

// --- Part B: Loading Our Content and Secrets ---
const quotes = require("../public/quotes.json");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

// --- Part C: Initializing the Services ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
sgMail.setApiKey(SENDGRID_API_KEY);

const db = admin.firestore(); // ⭐ Firestore reference

// --- Part D: The Main Logic ---
const sendDailyNewsletter = async () => {
  console.log("Starting daily newsletter job...");

  try {
    // 1. Get Today's Top Headline
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=1&apiKey=${NEWS_API_KEY}`
    );

    const article = newsResponse.data.articles[0];
    const headline = article ? article.title : "Check Out the Latest World News!";
    console.log(`Fetched headline: ${headline}`);

    // 2. Get a Random Quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    console.log(`Selected quote: ${randomQuote}`);

    // ⭐⭐⭐ 3. Fetch ONLY subscribed users from Firestore ⭐⭐⭐
    console.log("Fetching subscribed users...");
    const snap = await db.collection("subscribers").get();
    const allEmails = snap.docs
      .map((doc) => doc.data().email)
      .filter(Boolean);

    if (allEmails.length === 0) {
      console.log("❗ No subscribers found. Exiting.");
      return;
    }

    console.log(`📧 Found ${allEmails.length} subscribed users.`);

    // --- FIX: TURN OFF SENDGRID CLICK TRACKING ---
    const msg = {
      to: allEmails,
      from: SENDER_EMAIL,
      subject: `🌐 Your Daily Globe Update: ${randomQuote}`,

      // VERY IMPORTANT → prevents broken links caused by SendGrid wrapping
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Here's Your Daily Headline!</h2>

          <p style="font-size: 18px; font-weight: bold;">${headline}</p>

          <p>Click the button below to open Geophic:</p>

          <a href="https://rainbow-conkies-a345f6.netlify.app"
             target="_blank"
             style="display: inline-block; padding: 10px 15px; background-color: #007bff;
                    color: #fff; text-decoration: none; border-radius: 5px;">
             Open Geophic
          </a>
        </div>
      `,
    };

    await sgMail.sendMultiple(msg);
    console.log("✅ Newsletter sent successfully!");

  } catch (error) {
    console.error("❌ An error occurred:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// --- Part E: Run the Function ---
sendDailyNewsletter();
