// --- Part A: Importing Our Tools ---
// We import the necessary code libraries (our "tools") to perform specific tasks.
const admin = require("firebase-admin"); // Used to securely connect to your Firebase project and get user data.
const axios = require("axios"); // A simple tool for making HTTP requests to get data from the News API.
const sgMail = require("@sendgrid/mail"); // The official SendGrid library for sending emails.

// --- Part B: Loading Our Content and Secrets ---
// We need to load the clickbait quotes and securely access our secret API keys.
// IMPORTANT: This path assumes your quotes.json file is in the 'public' folder.
// If you put it elsewhere, you must update this path!
const quotes = require("../public/quotes.json");

// This is the magic part for GitHub Actions. It reads the secrets you stored in the repository settings.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

// --- Part C: Initializing the Services ---
// We need to configure our tools with the secret keys to authorize them.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
sgMail.setApiKey(SENDGRID_API_KEY);

// --- Part D: The Main Logic ---
// This is an async function, meaning it can perform tasks that take time (like API calls) without freezing.
const sendDailyNewsletter = async () => {
  console.log("Starting daily newsletter job...");

  try { // A try...catch block helps us handle any errors gracefully.
    // 1. Get Today's Top Headline from NewsAPI
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=1&apiKey=${NEWS_API_KEY}`
    );
    const article = newsResponse.data.articles[0];
    const headline = article ? article.title : "Check Out the Latest World News!";
    const articleUrl = article ? article.url : "https://news.google.com/";
    console.log(`Fetched headline: ${headline}`);

    // 2. Get a Random Quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    console.log(`Selected quote: ${randomQuote}`);

    // 3. Get All User Emails from Firebase Authentication
    const listUsersResult = await admin.auth().listUsers(1000); // Fetches up to 1000 users.
    const allEmails = listUsersResult.users.map((userRecord) => userRecord.email).filter(Boolean);

    if (allEmails.length === 0) {
      console.log("No users found. Exiting.");
      return; // Stop the script if there's no one to email.
    }
    console.log(`Found ${allEmails.length} users to email.`);

    // 4. Build and Send the Email via SendGrid
    const msg = {
      to: allEmails, // SendGrid can send to an array of emails at once!
      from: SENDER_EMAIL, // Your verified sender email.
      subject: `🌐 Your Daily Globe Update: ${randomQuote}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Here's Your Daily Headline!</h2>
          <p style="font-size: 18px; font-weight: bold;">${headline}</p>
          <p>Read the full story to learn more.</p>
          <a href="${articleUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
            Read More
          </a>
        </div>
      `,
    };
    await sgMail.send(msg); // This command sends the email.
    console.log("✅ Newsletter sent successfully!");

  } catch (error) {
    console.error("❌ An error occurred:", error);
    if (error.response) { // If the error is from an API (like SendGrid), log the specific details.
      console.error(error.response.body);
    }
  }
};

// --- Part E: Run the Function ---
// This line actually executes the main logic we defined above.
sendDailyNewsletter();

